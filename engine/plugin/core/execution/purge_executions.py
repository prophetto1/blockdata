from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\PurgeExecutions.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PurgeExecutions(Task):
    """Purge executions, logs, metrics, and storage files."""
    end_date: Property[str]
    purge_execution: Property[bool]
    purge_log: Property[bool]
    purge_metric: Property[bool]
    purge_storage: Property[bool]
    batch_size: Property[int]
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    start_date: Property[str] | None = None
    states: Property[list[State.Type]] | None = None

    def run(self, run_context: RunContext) -> PurgeExecutions.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        executions_count: int | None = None
        logs_count: int | None = None
        storages_count: int | None = None
        metrics_count: int | None = None
