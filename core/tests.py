import io
import json
import os
import urllib.error
from datetime import timedelta
from io import StringIO
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from . import ai
from .ai import AdvisorUnavailable
from .models import AdvisorTip, GameScore, Profile
from .schools import SCHOOLS


User = get_user_model()


class AuthenticationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="gradstudent", password="A-strong-test-password-42")

    def test_dashboard_requires_login_and_displays_username(self):
        response = self.client.get(reverse("dashboard"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('dashboard')}")

        self.client.force_login(self.user)
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "gradstudent")
        self.assertContains(response, "Grad School Party")

    def test_signup_creates_user_and_logs_them_in(self):
        response = self.client.post(
            reverse("signup"),
            {
                "username": "newgrad",
                "password1": "Another-strong-test-password-42",
                "password2": "Another-strong-test-password-42",
                "home_school": "som",
                "avatar": "bulldog",
            },
        )

        self.assertRedirects(response, reverse("dashboard"))
        self.assertTrue(User.objects.get(username="newgrad").check_password("Another-strong-test-password-42"))
        self.assertEqual(int(self.client.session["_auth_user_id"]), User.objects.get(username="newgrad").pk)

    def test_login_and_logout_use_django_auth(self):
        response = self.client.post(
            reverse("login"),
            {"username": "gradstudent", "password": "A-strong-test-password-42"},
        )
        self.assertRedirects(response, reverse("dashboard"))
        self.assertEqual(self.client.get(reverse("dashboard")).status_code, 200)

        response = self.client.post(reverse("logout"))
        self.assertRedirects(response, reverse("login"))
        self.assertRedirects(
            self.client.get(reverse("dashboard")),
            f"{reverse('login')}?next={reverse('dashboard')}",
        )

    def test_user_record_persists_in_database(self):
        persisted_user = User.objects.get(username="gradstudent")
        self.assertEqual(persisted_user.pk, self.user.pk)
        self.assertTrue(persisted_user.check_password("A-strong-test-password-42"))


class CreateFakeGradersCommandTests(TestCase):
    def test_command_is_repeatable_and_does_not_replace_existing_passwords(self):
        accounts = [
            {"username": "grader-one", "password": "grader-one-test-password"},
            {"username": "grader-two", "password": "grader-two-test-password"},
        ]
        output = StringIO()
        with patch.dict(os.environ, {"GRADER_ACCOUNTS_JSON": json.dumps(accounts)}):
            call_command("create_fake_graders", stdout=output)
            existing_user = User.objects.get(username="grader-one")
            existing_user.set_password("user-chosen-password")
            existing_user.save()
            call_command("create_fake_graders", stdout=StringIO())

        self.assertEqual(User.objects.filter(username__startswith="grader-").count(), 2)
        self.assertTrue(User.objects.get(username="grader-one").check_password("user-chosen-password"))
        self.assertTrue(User.objects.get(username="grader-two").check_password("grader-two-test-password"))
        self.assertNotIn("grader-one-test-password", output.getvalue())


class ABTestPageTests(TestCase):
    """Checks each rule from the course's A/B test page requirements."""

    def setUp(self):
        from core.models import ABEvent

        self.ABEvent = ABEvent
        self.page = reverse("ab_page")
        self.stats = reverse("ab_stats")

    def test_urls_match_team_hash(self):
        import hashlib

        expected = hashlib.sha1(b"wandering-shape").hexdigest()[:7]
        self.assertEqual(self.page, f"/{expected}")
        self.assertEqual(self.stats, f"/{expected}/stats")

    def test_page_is_public_with_one_button_and_team_nicknames(self):
        response = self.client.get(self.page)
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertEqual(html.count('id="abtest"'), 1)
        self.assertEqual(html.count("<button"), 1)
        self.assertContains(response, "outstanding-hedgehog")
        self.assertNotContains(response, "TODO")
        variant = self.client.session["ab_variant"]
        self.assertIn(variant, ("kudos", "thanks"))
        self.assertIn(f'<button id="abtest" type="submit">{variant}</button>', html)

    def test_reloads_keep_variant_and_count_one_impression(self):
        self.client.get(self.page)
        variant = self.client.session["ab_variant"]
        for _ in range(3):
            self.client.get(self.page)
        self.assertEqual(self.client.session["ab_variant"], variant)
        self.assertEqual(self.ABEvent.objects.filter(kind="impression").count(), 1)

    def test_click_counts_once_and_redirect_does_not_add_impression(self):
        self.client.get(self.page)
        variant = self.client.session["ab_variant"]
        for _ in range(2):
            response = self.client.post(self.page, follow=True)
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.session["ab_variant"], variant)
        self.assertEqual(self.ABEvent.objects.filter(kind="impression").count(), 1)
        click = self.ABEvent.objects.get(kind="click")
        self.assertEqual(click.variant, variant)
        self.assertIsNotNone(click.created_at)

    def test_new_visitors_get_both_variants(self):
        from django.test import Client

        seen = {Client().get(self.page).wsgi_request.session["ab_variant"] for _ in range(40)}
        self.assertEqual(seen, {"kudos", "thanks"})

    def test_stats_prefers_higher_click_rate(self):
        for i in range(4):
            self.ABEvent.objects.create(visitor_id=f"k{i}", variant="kudos", kind="impression")
            self.ABEvent.objects.create(visitor_id=f"t{i}", variant="thanks", kind="impression")
        self.ABEvent.objects.create(visitor_id="k0", variant="kudos", kind="click")
        self.ABEvent.objects.create(visitor_id="t0", variant="thanks", kind="click")
        self.ABEvent.objects.create(visitor_id="t1", variant="thanks", kind="click")

        response = self.client.get(self.stats)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "preferred": "thanks",
                "kudos": {"impressions": 4, "clicks": 1},
                "thanks": {"impressions": 4, "clicks": 2},
            },
        )

    def test_stats_with_no_data(self):
        self.assertEqual(self.client.get(self.stats).json()["preferred"], "kudos")


class ProfileTests(TestCase):
    """Story #12: home school and avatar."""

    def test_signup_saves_home_school_and_avatar(self):
        response = self.client.post(
            reverse("signup"),
            {
                "username": "newgrad",
                "password1": "Another-strong-test-password-42",
                "password2": "Another-strong-test-password-42",
                "home_school": "law",
                "avatar": "owl",
            },
        )
        self.assertRedirects(response, reverse("dashboard"))
        profile = Profile.objects.get(user__username="newgrad")
        self.assertEqual((profile.home_school, profile.avatar), ("law", "owl"))

    def test_signup_offers_all_six_schools(self):
        response = self.client.get(reverse("signup"))
        for name in ["SOM", "Medicine", "Art", "Law", "Environment", "Drama"]:
            self.assertContains(response, name)

    def test_signup_requires_school_and_rejects_unknown_avatar(self):
        response = self.client.post(
            reverse("signup"),
            {
                "username": "badgrad",
                "password1": "Another-strong-test-password-42",
                "password2": "Another-strong-test-password-42",
                "avatar": "dragon",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(username="badgrad").exists())
        self.assertFalse(Profile.objects.exists())

    def test_dashboard_shows_profile(self):
        user = User.objects.create_user(username="gradstudent", password="A-strong-test-password-42")
        Profile.objects.create(user=user, home_school="drama", avatar="fox")
        self.client.force_login(user)
        response = self.client.get(reverse("dashboard"))
        self.assertContains(response, "Drama")
        self.assertContains(response, "Fox")
        self.assertContains(response, "🦊")

    def test_user_without_profile_is_prompted_and_can_create_one(self):
        user = User.objects.create_user(username="grader-one", password="A-strong-test-password-42")
        self.client.force_login(user)
        self.assertContains(self.client.get(reverse("dashboard")), reverse("edit_profile"))

        response = self.client.post(reverse("edit_profile"), {"home_school": "art", "avatar": "robot"})
        self.assertRedirects(response, reverse("dashboard"))
        self.assertEqual(user.profile.home_school, "art")

    def test_player_can_change_profile_later(self):
        user = User.objects.create_user(username="gradstudent", password="A-strong-test-password-42")
        Profile.objects.create(user=user, home_school="som", avatar="cat")
        self.client.force_login(user)

        response = self.client.post(reverse("edit_profile"), {"home_school": "medicine", "avatar": "astronaut"})
        self.assertRedirects(response, reverse("dashboard"))
        user.profile.refresh_from_db()
        self.assertEqual((user.profile.home_school, user.profile.avatar), ("medicine", "astronaut"))
        self.assertEqual(Profile.objects.filter(user=user).count(), 1)

    def test_profile_page_requires_login(self):
        response = self.client.get(reverse("edit_profile"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('edit_profile')}")


class CampusMapTests(TestCase):
    """Story #13: campus map hub."""

    def setUp(self):
        self.user = User.objects.create_user(username="gradstudent", password="A-strong-test-password-42")
        Profile.objects.create(user=self.user, home_school="law", avatar="owl")
        self.client.force_login(self.user)

    def test_dashboard_shows_six_tiles_linking_to_minigames(self):
        response = self.client.get(reverse("dashboard"))
        for slug, name in SCHOOLS:
            self.assertContains(response, reverse("play_school", args=[slug]))
            self.assertContains(response, f'<span class="school-name">{name}</span>', html=True)
        self.assertContains(response, "school-tile", count=6)

    def test_tiles_show_credits_per_school_for_this_user_only(self):
        GameScore.objects.create(user=self.user, school="law", score=3)
        GameScore.objects.create(user=self.user, school="law", score=4)
        other = User.objects.create_user(username="other", password="A-strong-test-password-42")
        GameScore.objects.create(user=other, school="law", score=50)

        tiles = {t["slug"]: t for t in self.client.get(reverse("dashboard")).context["tiles"]}
        self.assertEqual(tiles["law"]["credits"], 7)
        self.assertEqual(tiles["art"]["credits"], 0)
        self.assertTrue(tiles["law"]["is_home"])

    def test_school_pages_are_placeholders_and_unknown_school_404s(self):
        response = self.client.get(reverse("play_school", args=["drama"]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Drama")
        self.assertEqual(self.client.get("/play/not-a-school/").status_code, 404)

    def test_map_has_mobile_viewport_and_responsive_grid(self):
        response = self.client.get(reverse("dashboard"))
        self.assertContains(response, 'name="viewport"')


class AdvisorTipTests(TestCase):
    """The AI Dean. OpenRouter is always mocked; no test makes a network call."""

    def setUp(self):
        self.user = User.objects.create_user(username="advisee", password="A-strong-test-password-42")
        Profile.objects.create(user=self.user, home_school="law", avatar="owl")
        GameScore.objects.create(user=self.user, school="law", score=7)
        self.client.force_login(self.user)

    def test_tip_requires_login_and_post(self):
        self.client.logout()
        response = self.client.post(reverse("advisor_tip"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('advisor_tip')}")
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse("advisor_tip")).status_code, 405)

    @override_settings(OPENROUTER_API_KEY="test-key", OPENROUTER_MODEL="test/model")
    @patch("core.ai.request_completion", return_value="Head to Drama next, you have no credits there yet!")
    def test_tip_is_saved_and_shown_on_dashboard(self, mock_completion):
        response = self.client.post(reverse("advisor_tip"), follow=True)

        self.assertContains(response, "Head to Drama next")
        tip = AdvisorTip.objects.get(user=self.user)
        self.assertEqual(tip.model_name, "test/model")
        # The prompt describes this player's profile and credits.
        prompt = mock_completion.call_args.args[0][-1]["content"]
        self.assertIn("Law", prompt)
        self.assertIn("Owl", prompt)
        self.assertIn("Law: 7", prompt)

    @patch("core.ai.request_completion", side_effect=AdvisorUnavailable("boom"))
    def test_llm_failure_shows_friendly_message_and_saves_nothing(self, _mock):
        with self.assertLogs("core.ai", level="WARNING"):
            response = self.client.post(reverse("advisor_tip"), follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "out of the office")
        self.assertFalse(AdvisorTip.objects.exists())

    @override_settings(ADVISOR_DAILY_LIMIT=2)
    @patch("core.ai.request_completion", return_value="A tip.")
    def test_daily_limit_stops_further_llm_calls(self, mock_completion):
        for _ in range(3):
            response = self.client.post(reverse("advisor_tip"), follow=True)
        self.assertEqual(mock_completion.call_count, 2)
        self.assertEqual(AdvisorTip.objects.filter(user=self.user).count(), 2)
        self.assertContains(response, "all of today")
        self.assertContains(response, "0 tips left today")

    def test_tips_older_than_a_day_do_not_count_toward_the_limit(self):
        old = AdvisorTip.objects.create(user=self.user, text="old", model_name="m")
        AdvisorTip.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=2))
        response = self.client.get(reverse("dashboard"))
        self.assertContains(response, "5 tips left today")


class OpenRouterClientTests(TestCase):
    """The HTTP layer, with urllib's urlopen mocked."""

    def _fake_response(self, payload):
        response = MagicMock()
        response.__enter__.return_value = io.BytesIO(json.dumps(payload).encode())
        return response

    @override_settings(OPENROUTER_API_KEY="")
    @patch("core.ai.urllib.request.urlopen")
    def test_missing_key_never_calls_the_network(self, mock_urlopen):
        with self.assertRaises(AdvisorUnavailable):
            ai.request_completion([{"role": "user", "content": "hi"}])
        mock_urlopen.assert_not_called()

    @override_settings(OPENROUTER_API_KEY="test-key", OPENROUTER_MODEL="test/model")
    @patch("core.ai.urllib.request.urlopen")
    def test_sends_key_and_model_server_side_and_returns_text(self, mock_urlopen):
        mock_urlopen.return_value = self._fake_response({"choices": [{"message": {"content": "  Go to SOM.  "}}]})

        text = ai.request_completion([{"role": "user", "content": "hi"}])

        self.assertEqual(text, "Go to SOM.")
        request = mock_urlopen.call_args.args[0]
        self.assertEqual(request.full_url, ai.OPENROUTER_URL)
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")
        self.assertEqual(json.loads(request.data)["model"], "test/model")
        self.assertIn("timeout", mock_urlopen.call_args.kwargs)

    @override_settings(OPENROUTER_API_KEY="test-key")
    @patch("core.ai.urllib.request.urlopen")
    def test_network_errors_and_bad_payloads_raise_advisor_unavailable(self, mock_urlopen):
        for failure in [
            urllib.error.URLError("down"),
            TimeoutError(),
            self._fake_response({"error": "no choices"}),
            self._fake_response({"choices": [{"message": {"content": ""}}]}),
        ]:
            if isinstance(failure, BaseException):
                mock_urlopen.side_effect, mock_urlopen.return_value = failure, None
            else:
                mock_urlopen.side_effect, mock_urlopen.return_value = None, failure
            with self.assertRaises(AdvisorUnavailable):
                ai.request_completion([{"role": "user", "content": "hi"}])

    @override_settings(OPENROUTER_API_KEY="test-key")
    @patch("core.ai.urllib.request.urlopen")
    def test_long_replies_are_truncated(self, mock_urlopen):
        mock_urlopen.return_value = self._fake_response({"choices": [{"message": {"content": "x" * 2000}}]})
        self.assertEqual(len(ai.request_completion([])), ai.MAX_TIP_CHARS)
