from django.urls import path
from .views import UploadView, GenerateView, ProviderStatusView, DocumentListView

urlpatterns = [
    path('upload/', UploadView.as_view(), name='upload'),
    path('generate/', GenerateView.as_view(), name='generate'),
    path('providers-status/', ProviderStatusView.as_view(), name='providers-status'),
    path('documents/', DocumentListView.as_view(), name='document-list'),
]
