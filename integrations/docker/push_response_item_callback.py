from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-docker\src\main\java\io\kestra\plugin\docker\PushResponseItemCallback.java
# WARNING: Unresolved types: Adapter, Exception, PushResponseItem, ResultCallback, Throwable

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PushResponseItemCallback(Adapter):
    run_context: RunContext | None = None
    error: Exception | None = None

    def on_next(self, item: PushResponseItem) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_error(self, throwable: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java
