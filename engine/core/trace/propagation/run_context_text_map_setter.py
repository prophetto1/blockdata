from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\propagation\RunContextTextMapSetter.java
# WARNING: Unresolved types: TextMapSetter

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunContextTextMapSetter:
    instance: ClassVar[RunContextTextMapSetter]

    def set(self, carrier: RunContext, key: str, value: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
