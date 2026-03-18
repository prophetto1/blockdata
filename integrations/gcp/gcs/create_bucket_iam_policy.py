from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\CreateBucketIamPolicy.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateBucketIamPolicy(AbstractGcs):
    """Add IAM binding to a GCS bucket"""
    name: Property[str]
    member: Property[str]
    role: Property[str]
    if_exists: Property[IfExists] = Property.ofValue(IfExists.SKIP)

    def run(self, run_context: RunContext) -> CreateBucketIamPolicy.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        bucket: str | None = None
        member: str | None = None
        role: str | None = None
        created: bool | None = None

    class IfExists(str, Enum):
        ERROR = "ERROR"
        SKIP = "SKIP"
