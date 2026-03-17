from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\propagation\ExecutionTextMapGetter.java
# WARNING: Unresolved types: TextMapGetter

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution


@dataclass(slots=True, kw_only=True)
class ExecutionTextMapGetter:
    instance: ClassVar[ExecutionTextMapGetter]

    def keys(self, carrier: Execution) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, carrier: Execution, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
