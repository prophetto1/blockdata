from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\ReplaceFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReplaceFilter:
    f_i_l_t_e_r__n_a_m_e: str = "replace"
    a_r_g_u_m_e_n_t__p_a_i_r_s: str = "replace_pairs"
    a_r_g_u_m_e_n_t__r_e_g_e_x_p: str = "regexp"
    a_r_g_s: list[str] = List.of(ARGUMENT_PAIRS, ARGUMENT_REGEXP)

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_map(self, input_map: dict[str, Any], replace_pair: dict[Any, Any], regexp: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_list(self, input_list: list[Any], replace_pair: dict[Any, Any], regexp: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_string(self, input: str, replace_pair: dict[Any, Any], regexp: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java
