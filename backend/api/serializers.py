from rest_framework import serializers
from .models import Document

class GenerateSerializer(serializers.Serializer):
    job_description = serializers.CharField(required=True)

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
