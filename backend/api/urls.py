from django.urls import path
from .views import (
    UploadView, GenerateView, ProviderStatusView, DocumentListView,
    DownloadPDFView, UpdateCVView, UserProfileView, UploadPhotoView, ServePhotoView,
    HealthCheckView, StartInterviewView, SubmitAnswerView, InterviewDetailView,
    InterviewListView, WeeklyFeedbackView, VoiceTTTView, VoiceSTTView
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health'),
    path('upload/', UploadView.as_view(), name='upload'),
    path('generate/', GenerateView.as_view(), name='generate'),
    path('update-cv/', UpdateCVView.as_view(), name='update-cv'),
    path('download-pdf/', DownloadPDFView.as_view(), name='download-pdf'),
    path('providers-status/', ProviderStatusView.as_view(), name='providers-status'),
    path('documents/', DocumentListView.as_view(), name='documents'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/photo/', UploadPhotoView.as_view(), name='profile-photo'),
    path('profile/photo/file/<str:filename>', ServePhotoView.as_view(), name='serve-photo'),
    path('interview/start/', StartInterviewView.as_view(), name='start-interview'),
    path('interview/answer/', SubmitAnswerView.as_view(), name='submit-answer'),
    path('interview/<int:interview_id>/', InterviewDetailView.as_view(), name='interview-detail'),
    path('interviews/', InterviewListView.as_view(), name='interview-list'),
    path('interview/feedback/', WeeklyFeedbackView.as_view(), name='weekly-feedback'),
    path('voice/tts/', VoiceTTTView.as_view(), name='voice-tts'),
    path('voice/stt/', VoiceSTTView.as_view(), name='voice-stt'),
]
