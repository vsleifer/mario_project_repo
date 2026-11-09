from django.db import models


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
