from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\YamlFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, ObjectMapper, PebbleTemplate, TypeReference, YAMLFactory

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class YamlFunction:
    m_a_p_p_e_r: ObjectMapper = new ObjectMapper(
        new YAMLFactory()
    ).findAndRegisterModules()
    t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[Any] = new TypeReference<>() {}

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
