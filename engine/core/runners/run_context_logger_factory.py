from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextLoggerFactory.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_kind import ExecutionKind
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.executions.log_entry import LogEntry
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context_logger import RunContextLogger
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.runners.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class RunContextLoggerFactory:
    log_queue: QueueInterface[LogEntry] | None = None

    def create(self, task_run: TaskRun, task: Task | None = None, execution_kind: ExecutionKind | None = None) -> RunContextLogger:
        raise NotImplementedError  # TODO: translate from Java
