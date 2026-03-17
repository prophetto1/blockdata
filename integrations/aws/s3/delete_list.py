from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.aws.s3.models.s3_object import S3Object


@dataclass(slots=True, kw_only=True)
class DeleteList(AbstractS3Object, RunnableTask, ListInterface):
    """Delete multiple S3 objects"""
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    encoding_type: Property[str] | None = None
    max_keys: Property[int] | None = None
    expected_bucket_owner: Property[str] | None = None
    regexp: Property[str] | None = None
    filter: Property[Filter] | None = None
    concurrent: int | None = None
    error_on_empty: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, logger: Logger, client: S3Client, bucket: str) -> Function[S3Object, Long]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int = 0
        size: int = 0


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int = 0
    size: int = 0
