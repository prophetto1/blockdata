from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\StartExecutorService.java
# WARNING: Unresolved types: ApplicationContext

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class StartExecutorService:
    start_executors: list[str] = Collections.emptyList()
    not_start_executors: list[str] = Collections.emptyList()
    application_context: ApplicationContext | None = None

    def apply_options(self, start_executors: list[str], not_start_executors: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def should_start_executor(self, executor_name: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
