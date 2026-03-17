from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\CreateBucket.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.gcs.abstract_bucket import AbstractBucket
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateBucket(AbstractBucket):
    """Create or update a GCS bucket"""
    if_exists: Property[IfExists] = Property.ofValue(IfExists.ERROR)

    def run(self, run_context: RunContext) -> AbstractBucket.Output:
        raise NotImplementedError  # TODO: translate from Java

    class IfExists(str, Enum):
        ERROR = "ERROR"
        UPDATE = "UPDATE"
        SKIP = "SKIP"
