from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerJobRunning.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.has_u_i_d import HasUID
from engine.core.runners.worker_instance import WorkerInstance
from engine.core.runners.worker_task_running import WorkerTaskRunning
from engine.core.runners.worker_trigger_running import WorkerTriggerRunning


@dataclass(slots=True, kw_only=True)
class WorkerJobRunning(ABC):
    worker_instance: WorkerInstance
    partition: int

    @abstractmethod
    def get_type(self) -> str:
        ...
