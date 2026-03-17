from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\propagation\ExecutionTextMapSetter.java
# WARNING: Unresolved types: TextMapSetter

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution


@dataclass(slots=True, kw_only=True)
class ExecutionTextMapSetter:
    instance: ClassVar[ExecutionTextMapSetter]

    def set(self, carrier: Execution, key: str, value: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
