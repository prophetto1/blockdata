from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\models\RunResult.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class RunResult:
    results: list[Result] | None = None
    elapsed_time: float | None = None
    args: dict[str, Any] | None = None

    @dataclass(slots=True)
    class Result:
        status: str | None = None
        timing: list[Timing] | None = None
        thread_id: str | None = None
        execution_time: float | None = None
        adapter_response: dict[str, str] | None = None
        message: str | None = None
        failures: int | None = None
        unique_id: str | None = None

        def state(self) -> State.Type:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Timing:
        name: str | None = None
        started_at: datetime | None = None
        completed_at: datetime | None = None
