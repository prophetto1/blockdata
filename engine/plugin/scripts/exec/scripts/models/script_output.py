from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\exec\scripts\models\ScriptOutput.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.output import Output
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult


@dataclass(slots=True, kw_only=True)
class ScriptOutput:
    exit_code: int
    vars: dict[str, Any] | None = None
    output_files: dict[str, str] | None = None
    std_out_line_count: int | None = None
    std_err_line_count: int | None = None
    task_runner: TaskRunnerDetailResult | None = None
