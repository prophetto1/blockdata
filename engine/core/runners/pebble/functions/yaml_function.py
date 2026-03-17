from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\YamlFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, ObjectMapper, PebbleTemplate, TypeReference, YAMLFactory

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class YamlFunction:
    mapper: ClassVar[ObjectMapper]
    type_reference: ClassVar[TypeReference[Any]]

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
