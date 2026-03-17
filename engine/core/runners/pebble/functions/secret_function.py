from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\SecretFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, ObjectMapper, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.services.namespace_service import NamespaceService
from engine.core.secret.secret_service import SecretService


@dataclass(slots=True, kw_only=True)
class SecretFunction:
    n_a_m_e: str = "secret"
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()
    s_u_b_k_e_y__a_r_g: str = "subkey"
    n_a_m_e_s_p_a_c_e__a_r_g: str = "namespace"
    k_e_y__a_r_g: str = "key"
    secret_service: SecretService | None = None
    namespace_service: NamespaceService | None = None

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_secret_key(self, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> str:
        raise NotImplementedError  # TODO: translate from Java
