from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\TaskRunnerResult.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.core.models.tasks.output import Output
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult


@dataclass(slots=True, kw_only=True)
class TaskRunnerResult:
    exit_code: int | None = None
    log_consumer: AbstractLogConsumer | None = None
    details: T | None = None
