from django.urls import path

from . import ab_test, views


# The A/B path is the first 7 characters of: printf %s wandering-shape | shasum
AB_TEST_HASH = "341e00b"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("signup/", views.signup, name="signup"),
    path("profile/", views.edit_profile, name="edit_profile"),
    path("advisor/tip/", views.advisor_tip, name="advisor_tip"),
    path("play/<slug:school>/", views.play_school, name="play_school"),
    path("play/<slug:school>/score/", views.submit_score, name="submit_score"),
    path(f"{AB_TEST_HASH}", ab_test.ab_page, name="ab_page"),
    path(f"{AB_TEST_HASH}/stats", ab_test.ab_stats, name="ab_stats"),
]
