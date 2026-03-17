from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\AbstractServiceLivenessCoordinator.java
# WARNING: Unresolved types: Exception, ServiceState

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.server.abstract_service_liveness_task import AbstractServiceLivenessTask
from engine.core.server.server_config import ServerConfig
from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance
from engine.core.server.service_liveness_store import ServiceLivenessStore
from engine.core.server.service_registry import ServiceRegistry


@dataclass(slots=True, kw_only=True)
class AbstractServiceLivenessCoordinator(ABC, AbstractServiceLivenessTask):
    d_e_f_a_u_l_t__s_c_h_e_d_u_l_e__j_i_t_t_e_r__m_a_x__m_s: ClassVar[int] = 500
    d_e_f_a_u_l_t__r_e_a_s_o_n__f_o_r__d_i_s_c_o_n_n_e_c_t_e_d: str = "The service was detected as non-responsive after the session timeout. " +
        "Service transitioned to the 'DISCONNECTED' state."
    d_e_f_a_u_l_t__r_e_a_s_o_n__f_o_r__n_o_t__r_u_n_n_i_n_g: str = "The service was detected as non-responsive or terminated after termination grace period. " +
        "Service transitioned to the 'NOT_RUNNING' state."
    t_a_s_k__n_a_m_e: ClassVar[str] = "service-liveness-coordinator-task"
    server_id: str = ServerInstance.INSTANCE_ID
    store: ServiceLivenessStore | None = None
    service_registry: ServiceRegistry | None = None

    def on_schedule(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def handle_all_non_responding_services(self, now: datetime) -> None:
        ...

    @abstractmethod
    def handle_all_workers_for_unclean_shutdown(self, now: datetime) -> None:
        ...

    @abstractmethod
    def update(self, instance: ServiceInstance, state: Service.ServiceState, reason: str) -> None:
        ...

    def get_schedule_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def filter_all_unclean_shutdown_services(self, instances: list[ServiceInstance], now: datetime) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def filter_all_non_responding_services(self, instances: list[ServiceInstance], now: datetime) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def handle_all_service_in_not_running_state(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_all_services_for_terminated_states(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def maybe_detect_and_log_new_connected_services(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def safely_update(self, instance: ServiceInstance, state: Service.ServiceState, reason: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def maybe_log_non_responding_after_termination_grace_period(instance: ServiceInstance, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java
