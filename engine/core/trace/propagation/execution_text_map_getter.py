from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\propagation\ExecutionTextMapGetter.java
# WARNING: Unresolved types: TextMapGetter

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution


@dataclass(slots=True, kw_only=True)
class ExecutionTextMapGetter:
    i_n_s_t_a_n_c_e: ExecutionTextMapGetter = new ExecutionTextMapGetter()

    def keys(self, carrier: Execution) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, carrier: Execution, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
