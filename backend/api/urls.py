from django.urls import path
from .views import (
    UploadView, GenerateView, ProviderStatusView, DocumentListView,
    DownloadPDFView, UpdateCVView, UserProfileView, UploadPhotoView, ServePhotoView
)

urlpatterns = [
    path('upload/', UploadView.as_view(), name='upload'),
    path('generate/', GenerateView.as_view(), name='generate'),
    path('update-cv/', UpdateCVView.as_view(), name='update-cv'),
    path('download-pdf/', DownloadPDFView.as_view(), name='download-pdf'),
    path('providers-status/', ProviderStatusView.as_view(), name='providers-status'),
    path('documents/', DocumentListView.as_view(), name='documents'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/photo/', UploadPhotoView.as_view(), name='profile-photo'),
    path('profile/photo/file/<str:filename>', ServePhotoView.as_view(), name='serve-photo'),
]
