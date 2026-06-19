#!/usr/bin/env python3
"""
Backfill script: links existing PDFs in MinIO to the sole user.
Run inside the backend container:
  docker compose exec backend python backfill_generated_cvs.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.contrib.auth import get_user_model
from api.models import GeneratedCV
from ai_services.blob_storage import BlobStorage

User = get_user_model()

def run():
    user = User.objects.first()
    if not user:
        print("No user found. Please create a user first.")
        return

    print(f"Backfilling PDFs for user: {user.username} (id={user.id})")

    storage = BlobStorage()
    response = storage.s3.list_objects_v2(Bucket=storage.bucket_name)
    contents = response.get('Contents', [])

    existing_keys = set(
        GeneratedCV.objects.filter(owner=user).values_list('blob_key', flat=True)
    )

    created = 0
    skipped = 0

    for obj in contents:
        key = obj['Key']
        if key in existing_keys:
            skipped += 1
            continue

        GeneratedCV.objects.create(
            owner=user,
            blob_key=key,
            file_name=key.split('/')[-1],
            job_description='',
        )
        created += 1
        print(f"  Created: {key}")

    print(f"\nDone. Created: {created}, Skipped: {skipped}, Total in DB: {GeneratedCV.objects.filter(owner=user).count()}")


if __name__ == '__main__':
    run()
