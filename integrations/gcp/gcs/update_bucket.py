from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.gcs.abstract_bucket import AbstractBucket
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateBucket(AbstractBucket, RunnableTask):
    """Update a GCS bucket"""

    def run(self, run_context: RunContext) -> AbstractBucket:
        raise NotImplementedError  # TODO: translate from Java
