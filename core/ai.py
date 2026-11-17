"""Server-side calls to the LLM through OpenRouter.

The browser never talks to OpenRouter: views call `advisor_tip`, which reads
the API key from the environment (settings.OPENROUTER_API_KEY). Any failure
(missing key, network error, timeout, bad response) raises AdvisorUnavailable
so the view can show a friendly message instead of crashing.

Tests must mock `request_completion` (or urllib's urlopen); they never make a
real network call.
"""

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

from .schools import SCHOOL_NAMES

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS = 15
MAX_TIP_CHARS = 500

SYSTEM_PROMPT = (
    "You are the Dean of Grad School Party, a light-hearted campus game set at six Yale "
    "graduate schools (SOM, Medicine, Art, Law, Environment, Drama). Players earn credits "
    "by playing each school's minigame. Give the player one short, upbeat, specific tip "
    "(at most two sentences, under 60 words) about which school to visit next and why. "
    "Plain text only, no lists or markdown."
)


class AdvisorUnavailable(Exception):
    """The LLM could not produce a tip right now."""


def request_completion(messages):
    """POST a chat completion to OpenRouter and return the reply text."""
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise AdvisorUnavailable("OPENROUTER_API_KEY is not set")

    body = json.dumps(
        {"model": settings.OPENROUTER_MODEL, "messages": messages, "max_tokens": 150}
    ).encode()
    request = urllib.request.Request(
        OPENROUTER_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Title": "Grad School Party",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = json.load(response)
        text = payload["choices"][0]["message"]["content"]
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, IndexError, TypeError) as exc:
        raise AdvisorUnavailable(f"OpenRouter request failed: {exc!r}") from exc

    text = (text or "").strip()
    if not text:
        raise AdvisorUnavailable("OpenRouter returned an empty reply")
    return text[:MAX_TIP_CHARS]


def build_messages(profile, credits):
    """Describe the player's progress to the model. `credits` maps school slug -> total."""
    if profile is not None:
        who = (
            f"The player's home school is {profile.get_home_school_display()} "
            f"and their avatar is a {profile.get_avatar_display()}."
        )
    else:
        who = "The player has not picked a home school yet."
    progress = ", ".join(f"{name}: {credits.get(slug, 0)}" for slug, name in SCHOOL_NAMES.items())
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"{who} Credits so far by school: {progress}."},
    ]


def advisor_tip(profile, credits):
    """Return a short tip for this player, or raise AdvisorUnavailable."""
    try:
        return request_completion(build_messages(profile, credits))
    except AdvisorUnavailable as exc:
        logger.warning("Advisor tip unavailable: %s", exc)
        raise
