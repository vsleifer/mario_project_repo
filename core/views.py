import json
import logging
from datetime import timedelta

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Sum
from django.http import Http404, JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from . import ai
from .forms import ProfileForm, SignupForm
from .minigames import MINIGAMES
from .models import AdvisorTip, GameScore, Profile
from .schools import LOCATION_NAMES, LOCATIONS, MAP_PINS, SOCIAL_SLUGS

logger = logging.getLogger(__name__)


def _credits_by_school(user):
    return dict(
        GameScore.objects.filter(user=user)
        .values_list("school")
        .annotate(total=Sum("score"))
    )


def _tips_left_today(user):
    since = timezone.now() - timedelta(days=1)
    used = AdvisorTip.objects.filter(user=user, created_at__gte=since).count()
    return max(settings.ADVISOR_DAILY_LIMIT - used, 0)


@login_required
def dashboard(request):
    profile = Profile.objects.filter(user=request.user).first()
    credits = _credits_by_school(request.user)
    tiles = [
        {
            "slug": slug,
            "name": name,
            "credits": credits.get(slug, 0),
            "is_home": profile is not None and profile.home_school == slug,
            "has_game": slug in MINIGAMES,
            "is_social": slug in SOCIAL_SLUGS,
            "pin": MAP_PINS[slug],
        }
        for slug, name in LOCATIONS
    ]
    context = {
        "profile": profile,
        "tiles": tiles,
        "latest_tip": AdvisorTip.objects.filter(user=request.user).order_by("-created_at").first(),
        "tips_left": _tips_left_today(request.user),
    }
    return render(request, "core/dashboard.html", context)


@login_required
@require_POST
def advisor_tip(request):
    """Ask the AI Dean for a tip. Failures and the daily limit show a message, never an error page."""
    if _tips_left_today(request.user) == 0:
        messages.info(request, "The Dean has given you all of today's tips. Come back tomorrow.")
        return redirect("dashboard")

    profile = Profile.objects.filter(user=request.user).first()
    try:
        text = ai.advisor_tip(profile, _credits_by_school(request.user))
    except ai.AdvisorUnavailable:
        messages.error(request, "The Dean is out of the office right now. Please try again later.")
        return redirect("dashboard")

    AdvisorTip.objects.create(user=request.user, text=text, model_name=settings.OPENROUTER_MODEL)
    return redirect("dashboard")


@login_required
def edit_profile(request):
    profile = Profile.objects.filter(user=request.user).first()
    if request.method == "POST":
        form = ProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.instance.user = request.user
            form.save()
            messages.success(request, "Profile saved.")
            return redirect("dashboard")
    else:
        form = ProfileForm(instance=profile)
    return render(request, "core/profile.html", {"form": form, "is_new": profile is None})


@login_required
def play_school(request, school):
    if school not in LOCATION_NAMES:
        raise Http404("Unknown school")
    context = {"school_slug": school, "school_name": LOCATION_NAMES[school]}
    game = MINIGAMES.get(school)
    if game is None:
        return render(request, "core/play_placeholder.html", context)
    best = GameScore.objects.filter(user=request.user, school=school).order_by("-score").first()
    context.update(game=game, best_score=best.score if best else 0)
    return render(request, game["template"], context)


@login_required
@require_POST
def submit_score(request, school):
    """Save one finished round. Body: JSON {"score": <int>}. Rejects scores outside 0..max_score."""
    game = MINIGAMES.get(school)
    if game is None:
        raise Http404("No minigame for this school")
    try:
        score = json.loads(request.body)["score"]
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"error": "Send JSON like {\"score\": 12}."}, status=400)
    if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= game["max_score"]:
        logger.warning("Rejected %s score %r from user %s", school, score, request.user.pk)
        return JsonResponse({"error": f"Score must be a whole number from 0 to {game['max_score']}."}, status=400)

    GameScore.objects.create(user=request.user, school=school, score=score)
    total = GameScore.objects.filter(user=request.user, school=school).aggregate(total=Sum("score"))["total"]
    return JsonResponse({"saved": True, "score": score, "school_credits": total})


def signup(request):
    if request.method == "POST":
        form = SignupForm(request.POST)
        if form.is_valid():
            with transaction.atomic():
                user = form.save()
            login(request, user)
            return redirect("dashboard")
    else:
        form = SignupForm()

    return render(request, "registration/signup.html", {"form": form})
