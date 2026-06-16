from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Document, UserProfile


class AuthOwnershipTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.user = get_user_model().objects.create_user(
            username="user@example.com",
            email="user@example.com",
            password="StrongPass123!",
        )
        self.other_user = get_user_model().objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPass123!",
        )

    def test_health_is_public_but_documents_require_authentication(self):
        self.assertEqual(self.client.get("/api/health/").status_code, 200)
        self.assertEqual(self.client.get("/api/documents/").status_code, 403)

    def test_login_creates_authenticated_session(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "user@example.com", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["authenticated"])
        self.assertEqual(response.data["user"]["email"], "user@example.com")

        session_response = self.client.get("/api/auth/session/")
        self.assertTrue(session_response.data["authenticated"])

    def test_document_list_is_scoped_to_authenticated_owner(self):
        Document.objects.create(owner=self.user, name="mine.pdf", status="SUCCESS")
        Document.objects.create(owner=self.other_user, name="theirs.pdf", status="SUCCESS")
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/documents/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "mine.pdf")

    def test_profile_is_scoped_to_authenticated_user(self):
        UserProfile.objects.create(user=self.other_user, full_name="Other User", email="other@example.com")
        self.client.force_authenticate(user=self.user)

        response = self.client.put(
            "/api/profile/",
            {"full_name": "Current User", "email": "user@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "Current User")
        self.assertTrue(UserProfile.objects.filter(user=self.user, full_name="Current User").exists())
        self.assertTrue(UserProfile.objects.filter(user=self.other_user, full_name="Other User").exists())
