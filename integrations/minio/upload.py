from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\Upload.java
# WARNING: Unresolved types: Builder, Exception, From, MinioAsyncClient, UploadObjectArgs, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.datagen.data import Data
from integrations.aws.s3.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractMinioObject):
    """Upload a file to a MinIO bucket."""
    from: Any
    key: Property[str] | None = None
    content_type: Property[str] | None = None
    metadata: Property[dict[str, str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def parse_from_property(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def uri_list_to_map(self, r_uri_list: java.util.List[str]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def upload_single(self, run_context: RunContext, client: MinioAsyncClient, bucket: str, key: str, uri: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def upload_multiple(self, run_context: RunContext, client: MinioAsyncClient, bucket: str, base_key: str, files: dict[str, str]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def copy_temp(self, run_context: RunContext, uri: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def apply_options(self, run_context: RunContext, builder: UploadObjectArgs.Builder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ObjectOutput):
        bucket: str | None = None
        key: str | None = None
