from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.aws.s3.models.file_info import FileInfo
from integrations.minio.model.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractS3Object, RunnableTask):
    """Download objects from S3"""
    key: Property[str] | None = None
    version_id: Property[str] | None = None
    compatibility_mode: Property[bool] | None = None
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    max_keys: Property[int] | None = None
    regexp: Property[str] | None = None
    max_files: Property[int] | None = None
    expected_bucket_owner: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid_multiple_files_mode(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_single_file_mode(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def download_single_file(self, run_context: RunContext, bucket: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_get_object_request(self, run_context: RunContext, bucket: str, key: str) -> GetObjectRequest:
        raise NotImplementedError  # TODO: translate from Java

    def download_multiple_files(self, run_context: RunContext, bucket: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_objects_list(self, run_context: RunContext) -> list:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ObjectOutput, io):
        uri: str | None = None
        content_length: int | None = None
        content_type: str | None = None
        metadata: dict[String, String] | None = None
        files: dict[String, FileInfo] | None = None


@dataclass(slots=True, kw_only=True)
class Output(ObjectOutput, io):
    uri: str | None = None
    content_length: int | None = None
    content_type: str | None = None
    metadata: dict[String, String] | None = None
    files: dict[String, FileInfo] | None = None
