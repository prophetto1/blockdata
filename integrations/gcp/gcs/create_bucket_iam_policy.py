from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class IfExists(str, Enum):
    ERROR = "ERROR"
    SKIP = "SKIP"


@dataclass(slots=True, kw_only=True)
class CreateBucketIamPolicy(AbstractGcs, RunnableTask):
    """Add IAM binding to a GCS bucket"""
    name: Property[str]
    member: Property[str]
    role: Property[str]
    if_exists: Property[IfExists] | None = None

    def run(self, run_context: RunContext) -> CreateBucketIamPolicy:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        bucket: str | None = None
        member: str | None = None
        role: str | None = None
        created: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    bucket: str | None = None
    member: str | None = None
    role: str | None = None
    created: bool | None = None
