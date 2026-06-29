import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DEBUG", "True")

import django

django.setup()

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from api.models import Document, UserProfile


class _AvailableProvider:
    def is_available(self):
        return True


class _FakeOrchestrator:
    providers = [_AvailableProvider()]

    def stream(self, prompt, system_prompt):
        yield "## Test User\n\nGenerated CV"


class _FakeVectorStore:
    def search(self, *args, **kwargs):
        return []


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

    @patch("api.views.BlobStorage")
    def test_profile_photo_upload_saves_blob_key_on_profile(self, storage_class):
        self.client.force_authenticate(user=self.user)
        blob_key = f"profile_{self.user.id}_uploaded.png"
        storage_class.return_value.save_photo.return_value = blob_key
        upload = SimpleUploadedFile("avatar.png", b"fake image bytes", content_type="image/png")

        response = self.client.post("/api/profile/photo/", {"photo": upload}, format="multipart")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["photo_url"], f"/api/profile/photo/file/{blob_key}")
        self.assertEqual(self.user.profile.photo_url, blob_key)

    @patch("api.views.BlobStorage")
    def test_profile_photo_upload_does_not_save_missing_blob(self, storage_class):
        self.client.force_authenticate(user=self.user)
        storage_class.return_value.save_photo.return_value = None
        upload = SimpleUploadedFile("avatar.png", b"fake image bytes", content_type="image/png")

        response = self.client.post("/api/profile/photo/", {"photo": upload}, format="multipart")

        self.assertEqual(response.status_code, 503)
        self.assertFalse(UserProfile.objects.filter(user=self.user).exists())

    @patch("api.views.BlobStorage")
    def test_saved_legacy_profile_photo_is_served_from_blob(self, storage_class):
        self.client.force_authenticate(user=self.user)
        UserProfile.objects.create(
            user=self.user,
            photo_url="/api/profile/photo/file/profile_20260615_151448.png",
        )
        storage_class.return_value.get_photo.return_value = b"fake image bytes"

        response = self.client.get("/api/profile/photo/file/profile_20260615_151448.png")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"fake image bytes")

    @patch("api.views.PDFGenerator.generate", return_value=b"%PDF-1.4")
    @patch("api.views.BlobStorage")
    def test_download_pdf_reads_profile_photo_from_blob_as_data_url(self, storage_class, pdf_generate):
        self.client.force_authenticate(user=self.user)
        blob_key = f"profile_{self.user.id}_avatar.png"
        storage_class.return_value.get_photo.return_value = b"fake image bytes"

        response = self.client.post(
            "/api/download-pdf/",
            {"markdown": "# Test User", "photo_url": f"/api/profile/photo/file/{blob_key}"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        photo_arg = pdf_generate.call_args.args[1]
        self.assertTrue(photo_arg.startswith("data:image/png;base64,"))

    @patch("api.views.BlobStorage")
    @patch("api.views.QdrantVectorStore", return_value=_FakeVectorStore())
    @patch("api.views.LLMOrchestrator", return_value=_FakeOrchestrator())
    def test_generate_ignores_unavailable_profile_photo_blob(self, _llm, _vector, storage_class):
        self.client.force_authenticate(user=self.user)
        storage_class.return_value.get_photo.return_value = None

        response = self.client.post(
            "/api/generate/",
            {
                "job_description": "Backend Python role",
                "profile_data": {
                    "full_name": "Current User",
                    "photo_url": f"profile_{self.user.id}_missing.png",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

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

    @patch("api.views.QdrantVectorStore", return_value=_FakeVectorStore())
    @patch("api.views.LLMOrchestrator", return_value=_FakeOrchestrator())
    def test_generate_accepts_empty_profile_photo_url(self, *_mocks):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/generate/",
            {
                "job_description": "Backend Python role",
                "profile_data": {"full_name": "Current User", "photo_url": None},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
