from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0006_generatedcv'),
    ]

    operations = [
        migrations.CreateModel(
            name='DebateResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_description', models.TextField()),
                ('cv_preview', models.CharField(blank=True, default='', max_length=500)),
                ('result_json', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='debate_results', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Debate Result',
                'verbose_name_plural': 'Debate Results',
                'ordering': ['-created_at'],
            },
        ),
    ]
