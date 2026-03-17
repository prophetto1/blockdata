from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\propagation\RunContextTextMapSetter.java
# WARNING: Unresolved types: TextMapSetter

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunContextTextMapSetter:
    i_n_s_t_a_n_c_e: RunContextTextMapSetter = new RunContextTextMapSetter()

    def set(self, carrier: RunContext, key: str, value: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
