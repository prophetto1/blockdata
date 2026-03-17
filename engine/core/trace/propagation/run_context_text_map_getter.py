from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\propagation\RunContextTextMapGetter.java
# WARNING: Unresolved types: TextMapGetter

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunContextTextMapGetter:
    i_n_s_t_a_n_c_e: RunContextTextMapGetter = new RunContextTextMapGetter()

    def keys(self, carrier: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, carrier: RunContext, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
