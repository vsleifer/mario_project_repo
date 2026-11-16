from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Sum
from django.http import Http404
from django.shortcuts import redirect, render

from .forms import ProfileForm, SignupForm
from .models import GameScore, Profile
from .schools import SCHOOL_NAMES, SCHOOLS


@login_required
def dashboard(request):
    profile = Profile.objects.filter(user=request.user).first()
    credits = dict(
        GameScore.objects.filter(user=request.user)
        .values_list("school")
        .annotate(total=Sum("score"))
    )
    tiles = [
        {
            "slug": slug,
            "name": name,
            "credits": credits.get(slug, 0),
            "is_home": profile is not None and profile.home_school == slug,
        }
        for slug, name in SCHOOLS
    ]
    return render(request, "core/dashboard.html", {"profile": profile, "tiles": tiles})


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
    if school not in SCHOOL_NAMES:
        raise Http404("Unknown school")
    # Placeholder until each school's minigame exists (story #14 builds the first one).
    return render(request, "core/play_placeholder.html", {"school_slug": school, "school_name": SCHOOL_NAMES[school]})


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
