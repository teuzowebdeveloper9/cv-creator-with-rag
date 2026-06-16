from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Document, UserProfile, Interview, InterviewQuestion, WeeklyFeedback


User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, trim_whitespace=False)
    full_name = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=validated_data.get('full_name', '').strip(),
        )
        UserProfile.objects.create(
            user=user,
            full_name=validated_data.get('full_name', '').strip(),
            email=email,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=attrs['password'],
        )
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")
        attrs['user'] = user
        return attrs


class SessionSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    user = serializers.DictField(allow_null=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


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
        read_only_fields = ('id', 'owner', 'status', 'error_message', 'created_at', 'updated_at')


class InterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewQuestion
        fields = '__all__'
        read_only_fields = ('id', 'interview', 'created_at')


class InterviewSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Interview
        fields = '__all__'
        read_only_fields = ('id', 'owner', 'started_at', 'completed_at')


class InterviewListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = ['id', 'status', 'job_role', 'tech_stack', 'total_questions', 'current_question', 'average_score', 'started_at', 'completed_at']


class WeeklyFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyFeedback
        fields = '__all__'
        read_only_fields = ('id', 'owner', 'created_at')


class StartInterviewSerializer(serializers.Serializer):
    job_role = serializers.CharField(required=True)
    tech_stack = serializers.CharField(required=False, allow_blank=True, default='')
    job_description = serializers.CharField(required=False, allow_blank=True, default='')


class SubmitAnswerSerializer(serializers.Serializer):
    interview_id = serializers.IntegerField(required=True)
    question_id = serializers.IntegerField(required=True)
    answer_text = serializers.CharField(required=False, allow_blank=True, default='')
    answer_audio_url = serializers.CharField(required=False, allow_blank=True, default='')
