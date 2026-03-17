from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\KvFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, IOException, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.services.k_v_store_service import KVStoreService
from engine.core.storages.kv.k_v_value import KVValue
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException


@dataclass(slots=True, kw_only=True)
class KvFunction:
    k_e_y__a_r_g_s: str = "key"
    e_r_r_o_r__o_n__m_i_s_s_i_n_g__a_r_g: str = "errorOnMissing"
    n_a_m_e_s_p_a_c_e__a_r_g: str = "namespace"
    kv_store_service: KVStoreService | None = None

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_value_with_inheritance(self, flow_namespace: str, key: str, tenant_id: str) -> Optional[KVValue]:
        raise NotImplementedError  # TODO: translate from Java

    def get_key(self, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> str:
        raise NotImplementedError  # TODO: translate from Java
