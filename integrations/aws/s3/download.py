from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\Download.java
# WARNING: Unresolved types: Exception, GetObjectRequest, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.aws.s3.models.file_info import FileInfo
from integrations.aws.s3.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractS3Object):
    """Download objects from S3"""
    compatibility_mode: Property[bool] = Property.ofValue(false)
    max_keys: Property[int] = Property.ofValue(1000)
    max_files: Property[int] = Property.ofValue(25)
    key: Property[str] | None = None
    version_id: Property[str] | None = None
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    regexp: Property[str] | None = None
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

    def get_objects_list(self, run_context: RunContext) -> List.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ObjectOutput):
        uri: str | None = None
        content_length: int | None = None
        content_type: str | None = None
        metadata: dict[str, str] | None = None
        files: dict[str, FileInfo] | None = None
