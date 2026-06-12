import boto3
import os
from botocore.client import Config
import logging

logger = logging.getLogger(__name__)

class BlobStorage:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        self.access_key = os.getenv("MINIO_ROOT_USER", "minioadmin")
        self.secret_key = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
        self.bucket_name = "resumes"
        
        self.s3 = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket_name)
        except:
            try:
                self.s3.create_bucket(Bucket=self.bucket_name)
                logger.info(f"Bucket '{self.bucket_name}' created.")
            except Exception as e:
                logger.error(f"Failed to create bucket: {str(e)}")

    def save_pdf(self, file_name: str, content: bytes):
        try:
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=content,
                ContentType='application/pdf'
            )
            logger.info(f"File {file_name} saved to blob storage.")
        except Exception as e:
            logger.error(f"Failed to save file to blob storage: {str(e)}")
