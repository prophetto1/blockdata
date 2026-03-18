from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\UpdateBucket.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_bucket import AbstractBucket
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateBucket(AbstractBucket):
    """Update a GCS bucket"""

    def run(self, run_context: RunContext) -> AbstractBucket.Output:
        raise NotImplementedError  # TODO: translate from Java
