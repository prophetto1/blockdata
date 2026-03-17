from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceInstance.java
# WARNING: Unresolved types: ServiceState

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.core.models.has_u_i_d import HasUID
from engine.core.server.metric import Metric
from engine.core.server.server_config import ServerConfig
from engine.core.server.server_instance import ServerInstance
from engine.core.server.service_type import ServiceType


@dataclass(slots=True, kw_only=True)
class ServiceInstance:
    s_e_r_v_i_c_e__s_t_a_t_e__u_p_d_a_t_e_d__e_v_e_n_t__t_y_p_e: ClassVar[str] = "service.state.updated"
    uid: str | None = None
    type: ServiceType | None = None
    state: ServiceState | None = None
    server: ServerInstance | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    events: list[TimestampedEvent] | None = None
    config: ServerConfig | None = None
    props: dict[str, Any] | None = None
    metrics: set[Metric] | None = None
    seq_id: int | None = None

    @staticmethod
    def create(id: str, type: ServiceType, server: ServerInstance, created_at: datetime, updated_at: datetime, config: ServerConfig, props: dict[str, Any], metrics: set[Metric]) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def is(self, type: ServiceType) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is(self, state: ServiceState) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def server(self, server: ServerInstance) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self, metrics: set[Metric]) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def state(self, new_state: ServiceState, updated_at: datetime) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def state(self, new_state: ServiceState, updated_at: datetime, reason: str) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def is_session_timeout_elapsed(self, now: datetime) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_termination_grace_period_elapsed(self, now: datetime) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def group_by_property(instances: list[ServiceInstance], property: str) -> dict[str, list[ServiceInstance]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TimestampedEvent:
        ts: datetime | None = None
        value: str | None = None
        type: str | None = None
        state: ServiceState | None = None
