from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from blockdata.core.models.property import Property
from blockdata.core.models.tasks.output import Output

@dataclass(slots=True, kw_only=True)
class Task:
    id: str | None = None
    type: str | None = None
    timeout: Property[float | int] | None = None
    retry: dict[str, Any] | None = None
    disabled: bool = False
    run_if: str | None = None
    allow_failure: bool = False
    allow_warning: bool = False


@runtime_checkable
class RunnableTask(Protocol):
    def run(self, run_context: object) -> Output | Any:
        ...
