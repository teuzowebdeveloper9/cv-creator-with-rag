from rest_framework import serializers
from .models import Document, UserProfile, Interview, InterviewQuestion, WeeklyFeedback


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


class InterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewQuestion
        fields = '__all__'


class InterviewSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Interview
        fields = '__all__'


class InterviewListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = ['id', 'status', 'job_role', 'tech_stack', 'total_questions', 'current_question', 'average_score', 'started_at', 'completed_at']


class WeeklyFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyFeedback
        fields = '__all__'


class StartInterviewSerializer(serializers.Serializer):
    job_role = serializers.CharField(required=True)
    tech_stack = serializers.CharField(required=False, allow_blank=True, default='')


class SubmitAnswerSerializer(serializers.Serializer):
    interview_id = serializers.IntegerField(required=True)
    question_id = serializers.IntegerField(required=True)
    answer_text = serializers.CharField(required=False, allow_blank=True, default='')
    answer_audio_url = serializers.CharField(required=False, allow_blank=True, default='')
