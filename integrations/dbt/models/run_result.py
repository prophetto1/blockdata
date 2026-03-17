from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class RunResult:
    results: list[Result] | None = None
    elapsed_time: float | None = None
    args: dict[String, Object] | None = None

    @dataclass(slots=True)
    class Result:
        status: str | None = None
        timing: list[Timing] | None = None
        thread_id: str | None = None
        execution_time: float | None = None
        adapter_response: dict[String, String] | None = None
        message: str | None = None
        failures: int | None = None
        unique_id: str | None = None

        def state(self) -> State:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Timing:
        name: str | None = None
        started_at: datetime | None = None
        completed_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Result:
    status: str | None = None
    timing: list[Timing] | None = None
    thread_id: str | None = None
    execution_time: float | None = None
    adapter_response: dict[String, String] | None = None
    message: str | None = None
    failures: int | None = None
    unique_id: str | None = None

    def state(self) -> State:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Timing:
    name: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
