from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\AbstractFileFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, IOException, Pattern, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.runners.local_path_factory import LocalPathFactory
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.services.namespace_service import NamespaceService
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class AbstractFileFunction:
    s_c_h_e_m_e__n_o_t__s_u_p_p_o_r_t_e_d__e_r_r_o_r: str = "Cannot process the URI %s: scheme not supported."
    k_e_s_t_r_a__s_c_h_e_m_e: str = "kestra:///"
    t_r_i_g_g_e_r: str = "trigger"
    n_a_m_e_s_p_a_c_e: str = "namespace"
    t_e_n_a_n_t__i_d: str = "tenantId"
    i_d: str = "id"
    p_a_t_h: str = "path"
    u_r_i__p_a_t_t_e_r_n: Pattern = Pattern.compile("^[a-zA-Z][a-zA-Z0-9+.-]*:.*")
    e_x_e_c_u_t_i_o_n__f_i_l_e: Pattern = Pattern.compile(".*/.*/executions/.*/tasks/.*/.*")
    namespace_service: NamespaceService | None = None
    storage_interface: StorageInterface | None = None
    local_path_factory: LocalPathFactory | None = None
    namespace_factory: NamespaceFactory | None = None
    enable_file_protocol: bool | None = None

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_error_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def is_file_uri_valid(self, namespace: str, flow_id: str, execution_id: str, path: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def check_allowed_file_and_return_namespace(self, context: EvaluationContext, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_file_from_parent_execution(self, context: EvaluationContext, path: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def check_if_file_from_allowed_namespace_and_return_it(self, path: str, tenant_id: str, from_namespace: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def check_enabled_local_file_and_return_namespace(self, args: dict[str, Any], flow: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def checked_allowed_namespace_and_return_namespace(self, args: dict[str, Any], ns_file_uri: str, tenant_id: str, flow: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_namespace(self, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
