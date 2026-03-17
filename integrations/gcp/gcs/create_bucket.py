from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.gcp.gcs.abstract_bucket import AbstractBucket
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class IfExists(str, Enum):
    ERROR = "ERROR"
    UPDATE = "UPDATE"
    SKIP = "SKIP"


@dataclass(slots=True, kw_only=True)
class CreateBucket(AbstractBucket, RunnableTask):
    """Create or update a GCS bucket"""
    if_exists: Property[IfExists] | None = None

    def run(self, run_context: RunContext) -> AbstractBucket:
        raise NotImplementedError  # TODO: translate from Java
