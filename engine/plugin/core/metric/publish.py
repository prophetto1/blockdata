from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\metric\Publish.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.metrics.abstract_metric import AbstractMetric
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Publish(Task):
    """Publish custom metrics from a Flow execution."""
    metrics: Property[list[AbstractMetric]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
