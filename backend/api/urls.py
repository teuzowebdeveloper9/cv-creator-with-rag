from django.urls import path
from .views import UploadView, GenerateView

urlpatterns = [
    path('upload/', UploadView.as_view(), name='upload'),
    path('generate/', GenerateView.as_view(), name='generate'),
]
