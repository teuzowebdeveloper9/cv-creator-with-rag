from rest_framework import serializers

class GenerateSerializer(serializers.Serializer):
    job_description = serializers.CharField(required=True)
