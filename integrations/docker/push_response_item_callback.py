from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PushResponseItemCallback(ResultCallback):
    run_context: RunContext | None = None
    error: Exception | None = None

    def on_next(self, item: PushResponseItem) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_error(self, throwable: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java
