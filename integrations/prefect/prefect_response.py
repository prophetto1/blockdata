from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class PrefectResponse:
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None

    def check_error(self, response: java) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def parse_response(self, response: java, clazz: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def parse_response_as_map(self, response: java) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
