from rest_framework import serializers
from .models import Document, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class GenerateSerializer(serializers.Serializer):
    job_description = serializers.CharField(required=True)
    profile_data = serializers.JSONField(required=False, default=dict)


class UpdateCVSerializer(serializers.Serializer):
    current_cv = serializers.CharField(required=True)
    edit_instruction = serializers.CharField(required=True)
    job_description = serializers.CharField(required=False, allow_blank=True, default='')


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
