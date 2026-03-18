from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerTriggerRunning.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.triggers.trigger import Trigger
from engine.core.runners.worker_instance import WorkerInstance
from engine.core.runners.worker_job_running import WorkerJobRunning
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class WorkerTriggerRunning(WorkerJobRunning):
    trigger: AbstractTrigger
    trigger_context: Trigger
    condition_context: ConditionContext
    type: ClassVar[str] = "trigger"
    type: str = TYPE

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(worker_trigger: WorkerTrigger, worker_instance: WorkerInstance, partition: int) -> WorkerTriggerRunning:
        raise NotImplementedError  # TODO: translate from Java
