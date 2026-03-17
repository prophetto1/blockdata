from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from integrations.aws.s3.abstract_s3 import AbstractS3
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateBucket(AbstractConnection, AbstractS3, RunnableTask):
    """Create an S3 bucket"""
    bucket: Property[str]
    grant_full_control: Property[str] | None = None
    grant_read: Property[str] | None = None
    grant_read_a_c_p: Property[str] | None = None
    grant_write: Property[str] | None = None
    grant_write_a_c_p: Property[str] | None = None
    acl: Property[str] | None = None
    object_lock_enabled_for_bucket: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        bucket: str | None = None
        region: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    bucket: str | None = None
    region: str | None = None
