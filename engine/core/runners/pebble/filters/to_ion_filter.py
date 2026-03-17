from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\ToIonFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, ObjectMapper, PebbleException, PebbleTemplate

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ToIonFilter:
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofIon()

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
