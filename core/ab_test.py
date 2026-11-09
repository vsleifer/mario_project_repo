"""A/B test page required by the course: /<first 7 chars of sha1(team nickname)>."""

import random
import re
import uuid
from functools import lru_cache

from django.conf import settings
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET, require_http_methods

from .models import ABEvent


VARIANTS = ("kudos", "thanks")
SESSION_VARIANT = "ab_variant"
SESSION_VISITOR = "ab_visitor_id"


@lru_cache(maxsize=1)
def team_nicknames():
    """Read member nicknames from docs/mgt656/team.yaml, skipping ones still marked TODO."""
    path = settings.BASE_DIR / "docs" / "mgt656" / "team.yaml"
    try:
        text = path.read_text()
    except OSError:
        return []
    names = re.findall(r"^\s*-\s*nickname:\s*(\S+)", text, flags=re.MULTILINE)
    return [name for name in names if name.upper() != "TODO"]


def record_event(visitor_id, variant, kind):
    """Store the event once per visitor; repeats are ignored."""
    try:
        ABEvent.objects.get_or_create(visitor_id=visitor_id, kind=kind, defaults={"variant": variant})
    except IntegrityError:
        pass  # two simultaneous requests from the same visitor; the other one already counted it


@require_http_methods(["GET", "POST"])
def ab_page(request):
    variant = request.session.get(SESSION_VARIANT)
    visitor_id = request.session.get(SESSION_VISITOR)

    if request.method == "POST":
        # Only count clicks from visitors who were shown the page.
        if variant in VARIANTS and visitor_id:
            record_event(visitor_id, variant, "click")
        return redirect("ab_page")

    if variant not in VARIANTS or not visitor_id:
        variant = random.choice(VARIANTS)
        visitor_id = uuid.uuid4().hex
        request.session[SESSION_VARIANT] = variant
        request.session[SESSION_VISITOR] = visitor_id
    record_event(visitor_id, variant, "impression")

    return render(
        request,
        "core/ab_test.html",
        {"variant": variant, "nicknames": team_nicknames(), "team_nickname": "wandering-shape"},
    )


@require_GET
def ab_stats(request):
    counts = {}
    for variant in VARIANTS:
        events = ABEvent.objects.filter(variant=variant)
        counts[variant] = {
            "impressions": events.filter(kind="impression").count(),
            "clicks": events.filter(kind="click").count(),
        }

    def click_rate(variant):
        impressions = counts[variant]["impressions"]
        return counts[variant]["clicks"] / impressions if impressions else 0.0

    preferred = "thanks" if click_rate("thanks") > click_rate("kudos") else "kudos"
    return JsonResponse({"preferred": preferred, **counts})
