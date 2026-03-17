from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.gcp.gcs.action_interface import ActionInterface
from integrations.minio.copy import Copy
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractS3Object, RunnableTask, ListInterface, ActionInterface):
    """Download multiple S3 objects"""
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    encoding_type: Property[str] | None = None
    max_keys: Property[int] | None = None
    compatibility_mode: Property[bool] | None = None
    expected_bucket_owner: Property[str] | None = None
    regexp: Property[str] | None = None
    filter: Property[Filter] | None = None
    max_files: Property[int] | None = None
    action: Property[ActionInterface] | None = None
    move_to: Copy | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        objects: java | None = None
        output_files: dict[String, URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    objects: java | None = None
    output_files: dict[String, URI] | None = None
