# Generated for multi-user ownership boundaries.

import os
import secrets

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import migrations, models
import django.db.models.deletion


INITIAL_ADMIN_EMAIL = "mateussoftwaredeveloper@gmail.com"


def create_initial_user_and_backfill(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("api", "UserProfile")
    Document = apps.get_model("api", "Document")
    Interview = apps.get_model("api", "Interview")
    WeeklyFeedback = apps.get_model("api", "WeeklyFeedback")

    password = os.getenv("INITIAL_ADMIN_PASSWORD")
    user, created = User.objects.get_or_create(
        username=INITIAL_ADMIN_EMAIL,
        defaults={"email": INITIAL_ADMIN_EMAIL, "is_staff": True, "is_superuser": True},
    )
    changed = False
    if not user.email:
        user.email = INITIAL_ADMIN_EMAIL
        changed = True
    if created:
        user.password = make_password(password or secrets.token_urlsafe(32))
        changed = True
    if changed:
        user.save()

    profile = UserProfile.objects.filter(user=user).first()
    first_orphan = UserProfile.objects.filter(user__isnull=True).order_by("id").first()
    if profile is None:
        if first_orphan:
            first_orphan.user = user
            if not first_orphan.email:
                first_orphan.email = INITIAL_ADMIN_EMAIL
            first_orphan.save()
        else:
            UserProfile.objects.create(user=user, email=INITIAL_ADMIN_EMAIL)

    for profile in UserProfile.objects.filter(user__isnull=True).order_by("id"):
        generated_email = profile.email or f"legacy-profile-{profile.id}@local.invalid"
        legacy_user, _ = User.objects.get_or_create(
            username=generated_email,
            defaults={"email": generated_email, "is_active": False},
        )
        profile.user = legacy_user
        profile.save()
    Document.objects.filter(owner__isnull=True).update(owner=user)
    Interview.objects.filter(owner__isnull=True).update(owner=user)
    WeeklyFeedback.objects.filter(owner__isnull=True).update(owner=user)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0004_interview_weeklyfeedback_interviewquestion'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='user',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='document',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='documents', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='interview',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='interviews', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='weeklyfeedback',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='weekly_feedbacks', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(create_initial_user_and_backfill, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='userprofile',
            name='user',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='document',
            name='owner',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='interview',
            name='owner',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interviews', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='weeklyfeedback',
            name='owner',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weekly_feedbacks', to=settings.AUTH_USER_MODEL),
        ),
    ]
