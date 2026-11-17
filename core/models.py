from django.conf import settings
from django.db import models

from .schools import AVATAR_CHOICES, AVATAR_EMOJI, SCHOOLS


class ABEvent(models.Model):
    """One impression or one click on the A/B test page, for one visitor."""

    VARIANT_CHOICES = [("kudos", "kudos"), ("thanks", "thanks")]
    KIND_CHOICES = [("impression", "impression"), ("click", "click")]

    visitor_id = models.CharField(max_length=64)
    variant = models.CharField(max_length=10, choices=VARIANT_CHOICES)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # A visitor counts at most one impression and at most one click.
            models.UniqueConstraint(fields=["visitor_id", "kind"], name="one_event_per_visitor_per_kind"),
        ]

    def __str__(self):
        return f"{self.variant} {self.kind} ({self.visitor_id})"


class Profile(models.Model):
    """A player's game identity: their home school and avatar."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    home_school = models.CharField(max_length=20, choices=SCHOOLS)
    avatar = models.CharField(max_length=20, choices=AVATAR_CHOICES)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def avatar_emoji(self):
        return AVATAR_EMOJI.get(self.avatar, "")

    def __str__(self):
        return f"{self.user} ({self.home_school}, {self.avatar})"


class GameScore(models.Model):
    """One finished minigame play. Each play's score counts as credits at that school."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scores")
    school = models.CharField(max_length=20, choices=SCHOOLS)
    score = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "school"])]

    def __str__(self):
        return f"{self.user} {self.school}: {self.score}"


class AdvisorTip(models.Model):
    """One tip the AI Dean gave a player. Stored so the dashboard can show it and limit usage."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="advisor_tips")
    text = models.TextField()
    model_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self):
        return f"{self.user} tip at {self.created_at:%Y-%m-%d %H:%M}"
