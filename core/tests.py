import json
import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse


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
