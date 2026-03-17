from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\NanoIDFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, PebbleTemplate, SecureRandom

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class NanoIDFunction:
    d_e_f_a_u_l_t__l_e_n_g_t_h: int = 21
    d_e_f_a_u_l_t__a_l_p_h_a_b_e_t: list[str] = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".toCharArray()
    secure_random: SecureRandom = new SecureRandom()
    l_e_n_g_t_h: str = "length"
    a_l_p_h_a_b_e_t: str = "alphabet"
    m_a_x__l_e_n_g_t_h: int = 1000

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_length(args: dict[str, Any], self: PebbleTemplate, line_number: int) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def create_nano_i_d(self, length: int, alphabet: list[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
