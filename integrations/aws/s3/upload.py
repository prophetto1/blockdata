from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\Upload.java
# WARNING: Unresolved types: Builder, ChecksumAlgorithm, Exception, From, ObjectLockLegalHoldStatus, ObjectLockMode, PutObjectRequest, S3TransferManager, ServerSideEncryption, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.datagen.data import Data
from integrations.aws.s3.models.file_info import FileInfo
from integrations.aws.s3.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.gcp.gcs.models.storage_class import StorageClass


@dataclass(slots=True, kw_only=True)
class Upload(AbstractS3Object):
    """Upload files to S3"""
    from: Any
    key: Property[str]
    compatibility_mode: Property[bool] = Property.ofValue(false)
    metadata: Property[dict[str, str]] | None = None
    cache_control: Property[str] | None = None
    content_type: Property[str] | None = None
    content_encoding: Property[str] | None = None
    content_disposition: Property[str] | None = None
    content_language: Property[str] | None = None
    content_length: Property[int] | None = None
    expires: Property[str] | None = None
    acl: Property[str] | None = None
    storage_class: Property[StorageClass] | None = None
    server_side_encryption: Property[ServerSideEncryption] | None = None
    bucket_key_enabled: Property[bool] | None = None
    checksum_algorithm: Property[ChecksumAlgorithm] | None = None
    expected_bucket_owner: Property[str] | None = None
    object_lock_mode: Property[ObjectLockMode] | None = None
    object_lock_legal_hold_status: Property[ObjectLockLegalHoldStatus] | None = None
    object_lock_retain_until_date: Property[str] | None = None
    checksum: Property[str] | None = None
    tagging: Property[dict[str, str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def uri_list_to_map(self, r_uri_list: list[str]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_from_property(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def upload_single_file(self, run_context: RunContext, transfer_manager: S3TransferManager, bucket: str, key: str, rendered_from: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def upload_multiple_files(self, run_context: RunContext, transfer_manager: S3TransferManager, bucket: str, base_key: str, files_to_upload: dict[str, str]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def copy_file_to_temp(self, run_context: RunContext, rendered_from: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def record_metrics(self, run_context: RunContext, file: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_put_object_request(self, run_context: RunContext, bucket: str, key: str) -> PutObjectRequest:
        raise NotImplementedError  # TODO: translate from Java

    def apply_request_options(self, run_context: RunContext, builder: PutObjectRequest.Builder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ObjectOutput):
        bucket: str | None = None
        key: str | None = None
        files: dict[str, FileInfo] | None = None
