from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\Task.java
# WARNING: Unresolved types: Level

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from engine.core.models.assets.assets_declaration import AssetsDeclaration
from engine.core.models.tasks.cache import Cache
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task_interface import TaskInterface
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.tasks.worker_group import WorkerGroup


@dataclass(slots=True, kw_only=True)
class Task(ABC):
    disabled: bool = False
    allow_failure: bool = False
    log_to_file: bool = False
    run_if: str = "true"
    allow_warning: bool = False
    id: str | None = None
    type: str | None = None
    version: str | None = None
    description: str | None = None
    retry: AbstractRetry | None = None
    timeout: Property[timedelta] | None = None
    worker_group: WorkerGroup | None = None
    log_level: Level | None = None
    task_cache: Cache | None = None
    assets: AssetsDeclaration | None = None

    def find_by_id(self, id: str) -> Optional[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, id: str, run_context: RunContext, task_run: TaskRun) -> Optional[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def is_flowable(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_send_to_worker_task(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
