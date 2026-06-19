import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0005_multiuser_ownership'),
    ]

    operations = [
        migrations.CreateModel(
            name='GeneratedCV',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('blob_key', models.CharField(max_length=500)),
                ('file_name', models.CharField(max_length=255)),
                ('job_description', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='generated_cvs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Generated CV',
                'verbose_name_plural': 'Generated CVs',
                'ordering': ['-created_at'],
            },
        ),
    ]
