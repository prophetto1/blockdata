from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\KSUIDFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, KsuidGenerator, PebbleTemplate, SecureRandom

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class KSUIDFunction:
    ksuid_generator: ClassVar[KsuidGenerator]

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_ksuid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
