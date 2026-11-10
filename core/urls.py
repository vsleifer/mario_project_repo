from django.urls import path

from . import ab_test, views


# The A/B path is the first 7 characters of: printf %s wandering-shape | shasum
AB_TEST_HASH = "341e00b"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("signup/", views.signup, name="signup"),
    path(f"{AB_TEST_HASH}", ab_test.ab_page, name="ab_page"),
    path(f"{AB_TEST_HASH}/stats", ab_test.ab_stats, name="ab_stats"),
]
