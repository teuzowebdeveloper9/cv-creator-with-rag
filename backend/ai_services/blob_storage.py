import boto3
import os
import re
from botocore.client import Config
import logging

logger = logging.getLogger(__name__)

_SAFE_KEY_PATTERN = re.compile(r'^[\w\-\.]+$')


class BlobStorage:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        self.access_key = os.getenv("MINIO_ROOT_USER", "")
        self.secret_key = os.getenv("MINIO_ROOT_PASSWORD", "")
        self.bucket_name = "resumes"

        if not self.access_key or not self.secret_key:
            logger.warning("MINIO_ROOT_USER/MINIO_ROOT_PASSWORD not set; using defaults.")

        self.s3 = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key or "minioadmin",
            aws_secret_access_key=self.secret_key or "minioadmin",
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket_name)
        except Exception:
            try:
                self.s3.create_bucket(Bucket=self.bucket_name)
                logger.info(f"Bucket '{self.bucket_name}' created.")
            except Exception as e:
                logger.error(f"Failed to create bucket: {e}")

    def save_pdf(self, file_name: str, content: bytes):
        if not _SAFE_KEY_PATTERN.match(file_name):
            logger.error(f"Rejected unsafe blob key: {file_name}")
            return
        if ".." in file_name or "/" in file_name:
            logger.error(f"Rejected blob key with path traversal: {file_name}")
            return
        try:
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=content,
                ContentType='application/pdf'
            )
            logger.info(f"File {file_name} saved to blob storage.")
        except Exception as e:
            logger.error(f"Failed to save file to blob storage: {e}")
