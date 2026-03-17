from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\contexts\KestraContext.java
# WARNING: Unresolved types: ApplicationContext, AtomicBoolean, AtomicReference, Environment, Supplier

from dataclasses import dataclass
from typing import Any

from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.models.server_type import ServerType
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class KestraContext:
    i_n_s_t_a_n_c_e: AtomicReference[KestraContext] = new AtomicReference<>()
    k_e_s_t_r_a__s_e_r_v_e_r__t_y_p_e: str = "kestra.server-type"
    k_e_s_t_r_a__w_o_r_k_e_r__m_a_x__n_u_m__t_h_r_e_a_d_s: str = "kestra.worker.max-num-threads"
    k_e_s_t_r_a__w_o_r_k_e_r__g_r_o_u_p__k_e_y: str = "kestra.worker.group-key"

    @staticmethod
    def get_context() -> KestraContext:
        raise NotImplementedError  # TODO: translate from Java

    def get_server_type(self) -> ServerType:
        raise NotImplementedError  # TODO: translate from Java

    def get_worker_max_num_threads(self) -> Optional[int]:
        raise NotImplementedError  # TODO: translate from Java

    def get_worker_group_key(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def inject_worker_configs(self, max_num_threads: int, worker_group_key: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_version(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_registry(self) -> PluginRegistry:
        raise NotImplementedError  # TODO: translate from Java

    def get_storage_interface(self) -> StorageInterface:
        raise NotImplementedError  # TODO: translate from Java

    def get_environments(self) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def shutdown(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Initializer(KestraContext):
        is_shutdown: AtomicBoolean = new AtomicBoolean(false)
        application_context: ApplicationContext | None = None
        environment: Environment | None = None
        version: Supplier[str] | None = None

        def get_server_type(self) -> ServerType:
            raise NotImplementedError  # TODO: translate from Java

        def get_worker_max_num_threads(self) -> Optional[int]:
            raise NotImplementedError  # TODO: translate from Java

        def get_worker_group_key(self) -> Optional[str]:
            raise NotImplementedError  # TODO: translate from Java

        def inject_worker_configs(self, max_num_threads: int, worker_group_key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def shutdown(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def get_version(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_plugin_registry(self) -> PluginRegistry:
            raise NotImplementedError  # TODO: translate from Java

        def get_storage_interface(self) -> StorageInterface:
            raise NotImplementedError  # TODO: translate from Java

        def get_environments(self) -> set[str]:
            raise NotImplementedError  # TODO: translate from Java
