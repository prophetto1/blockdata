from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkSubmitTaskSetting:
    parameters: Any | None = None

    def to_spark_submit_task(self, run_context: RunContext) -> SparkSubmitTask:
        raise NotImplementedError  # TODO: translate from Java
