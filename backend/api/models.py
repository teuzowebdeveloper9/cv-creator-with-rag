from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    linkedin = models.URLField(blank=True, default="")
    github = models.URLField(blank=True, default="")
    portfolio = models.URLField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    photo_url = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return self.full_name or "Unnamed Profile"


class Document(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.status}"


class Interview(models.Model):
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='interviews')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    job_role = models.CharField(max_length=255, blank=True, default="")
    tech_stack = models.CharField(max_length=500, blank=True, default="")
    total_questions = models.IntegerField(default=0)
    current_question = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Interview"
        verbose_name_plural = "Interviews"
        ordering = ['-started_at']

    def __str__(self):
        return f"Interview {self.id} - {self.status}"


class InterviewQuestion(models.Model):
    interview = models.ForeignKey(Interview, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_audio_url = models.CharField(max_length=500, blank=True, default="")
    answer_text = models.TextField(blank=True, default="")
    answer_audio_url = models.CharField(max_length=500, blank=True, default="")
    score = models.FloatField(default=0.0)
    feedback = models.TextField(blank=True, default="")
    strengths = models.TextField(blank=True, default="")
    improvements = models.TextField(blank=True, default="")
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Interview Question"
        verbose_name_plural = "Interview Questions"
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."


class WeeklyFeedback(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='weekly_feedbacks')
    week_start = models.DateField()
    week_end = models.DateField()
    summary = models.TextField(blank=True, default="")
    overall_score = models.FloatField(default=0.0)
    strengths = models.TextField(blank=True, default="")
    improvements = models.TextField(blank=True, default="")
    recommendations = models.TextField(blank=True, default="")
    interviews_analyzed = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Weekly Feedback"
        verbose_name_plural = "Weekly Feedbacks"
        ordering = ['-week_start']

    def __str__(self):
        return f"Weekly Feedback: {self.week_start} to {self.week_end}"
