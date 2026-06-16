import boto3
import hashlib
import os
import re
from botocore.client import Config
import logging

logger = logging.getLogger(__name__)

_SAFE_SEGMENT_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$')
_MAX_BLOB_KEY_LENGTH = 512


def is_safe_blob_key(key: str) -> bool:
    if not isinstance(key, str):
        return False

    key = key.strip()
    if not key or len(key) > _MAX_BLOB_KEY_LENGTH:
        return False
    if key.startswith("/") or "\\" in key or "://" in key:
        return False
    if any(ord(char) < 32 for char in key):
        return False

    segments = key.split("/")
    return all(
        segment not in {"", ".", ".."} and _SAFE_SEGMENT_PATTERN.fullmatch(segment)
        for segment in segments
    )


def require_safe_blob_key(key: str) -> str:
    if not is_safe_blob_key(key):
        raise ValueError("Unsafe blob key")
    return key.strip()


class BlobStorage:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        self.access_key = os.getenv("MINIO_ROOT_USER", "")
        self.secret_key = os.getenv("MINIO_ROOT_PASSWORD", "")
        self.bucket_name = "resumes"
        self.photo_bucket = "photos"

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
        self._ensure_bucket(self.bucket_name)
        self._ensure_bucket(self.photo_bucket)

    def _ensure_bucket(self, bucket_name: str):
        try:
            self.s3.head_bucket(Bucket=bucket_name)
        except Exception:
            try:
                self.s3.create_bucket(Bucket=bucket_name)
                logger.info(f"Bucket '{bucket_name}' created.")
            except Exception as e:
                logger.error(f"Failed to create bucket {bucket_name}: {e}")

    @staticmethod
    def scoped_key(file_name: str, user_id: object = None, namespace: str = "files") -> str:
        safe_file_name = require_safe_blob_key(file_name)
        if "/" in safe_file_name:
            raise ValueError("File name must not contain path separators")

        if user_id is None or str(user_id).strip() == "":
            return safe_file_name

        safe_namespace = BlobStorage._scope_segment(namespace)
        safe_user_id = BlobStorage._scope_segment(user_id)
        return require_safe_blob_key(f"users/{safe_user_id}/{safe_namespace}/{safe_file_name}")

    @staticmethod
    def _scope_segment(value: object) -> str:
        raw_value = str(value).strip()
        safe_value = re.sub(r"[^A-Za-z0-9_.-]+", "-", raw_value).strip(".-")
        if not safe_value:
            safe_value = "value"
        if safe_value != raw_value:
            digest = hashlib.sha256(raw_value.encode("utf-8")).hexdigest()[:12]
            safe_value = f"{safe_value[:48]}-{digest}"
        return require_safe_blob_key(safe_value[:128])

    def save_pdf(self, file_name: str, content: bytes, user_id: object = None) -> str | None:
        try:
            key = self.scoped_key(file_name, user_id=user_id, namespace="pdfs")
        except ValueError:
            logger.error(f"Rejected unsafe PDF blob key: {file_name}")
            return None

        try:
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content,
                ContentType='application/pdf'
            )
            logger.info(f"File {key} saved to blob storage.")
            return key
        except Exception as e:
            logger.error(f"Failed to save file to blob storage: {e}")
            return None

    def save_photo(self, file_name: str, content: bytes, user_id: object = None) -> str | None:
        try:
            key = self.scoped_key(file_name, user_id=user_id, namespace="photos")
        except ValueError:
            logger.error(f"Rejected unsafe photo key: {file_name}")
            return None

        content_type = 'image/jpeg'
        if file_name.endswith('.png'):
            content_type = 'image/png'
        elif file_name.endswith('.webp'):
            content_type = 'image/webp'
        try:
            self.s3.put_object(
                Bucket=self.photo_bucket,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
            logger.info(f"Photo {key} saved to blob storage.")
            return key
        except Exception as e:
            logger.error(f"Failed to save photo to blob storage: {e}")
            return None

    def get_photo(self, file_name: str) -> bytes | None:
        try:
            key = require_safe_blob_key(file_name)
        except ValueError:
            logger.error(f"Rejected unsafe photo key: {file_name}")
            return None

        try:
            response = self.s3.get_object(Bucket=self.photo_bucket, Key=key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to get photo from blob storage: {e}")
            return None

    def get_pdf(self, file_name: str) -> bytes | None:
        try:
            key = require_safe_blob_key(file_name)
        except ValueError:
            logger.error(f"Rejected unsafe PDF blob key: {file_name}")
            return None

        try:
            response = self.s3.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to get PDF from blob storage: {e}")
            return None
