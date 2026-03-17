from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceLivenessManager.java
# WARNING: Unresolved types: ReentrantLock, ServiceState

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar, Optional, Protocol

from engine.core.server.abstract_service_liveness_task import AbstractServiceLivenessTask
from engine.core.server.local_service_state import LocalServiceState
from engine.core.server.local_service_state_factory import LocalServiceStateFactory
from engine.core.server.server_config import ServerConfig
from engine.core.server.server_instance_factory import ServerInstanceFactory
from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance
from engine.core.server.service_liveness_updater import ServiceLivenessUpdater
from engine.core.server.service_registry import ServiceRegistry
from engine.core.server.service_state_change_event import ServiceStateChangeEvent


@dataclass(slots=True, kw_only=True)
class ServiceLivenessManager(AbstractServiceLivenessTask):
    state_lock: ReentrantLock
    logger: ClassVar[Logger] = getLogger(__name__)
    task_name: ClassVar[str] = "service-liveness-manager-task"
    local_service_state_factory: LocalServiceStateFactory | None = None
    service_liveness_updater: ServiceLivenessUpdater | None = None
    on_state_transition_failure_callback: OnStateTransitionFailureCallback | None = None
    server_instance_factory: ServerInstanceFactory | None = None
    service_registry: ServiceRegistry | None = None
    last_succeed_state_updated: datetime | None = None

    def on_service_state_change_event(self, event: ServiceStateChangeEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_create_state(self, event: ServiceStateChangeEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_schedule_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def on_schedule(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def before_scheduled_state_update(self, now: datetime, service: Service, instance: ServiceInstance) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def last_succeed_state_updated(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def update_service_instance_state(self, now: datetime, service: Service, new_state: Service.ServiceState, on_state_change_error: OnStateTransitionFailureCallback) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def may_disable_state_update(self, service: Service, instance: ServiceInstance) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def local_service_state(self, service: Service) -> LocalServiceState:
        raise NotImplementedError  # TODO: translate from Java

    def all_service_instances(self) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def update_service_instance(self, service: Service, instance: ServiceInstance) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_worker_server(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_server_disconnected(self, now: datetime) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_elapsed_milli_since_last_state_update(self, now: datetime) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    class OnStateTransitionFailureCallback(Protocol):
        def execute(self, now: datetime, service: Service, instance: ServiceInstance, is_liveness_enabled: bool) -> Optional[ServiceInstance]: ...

    @dataclass(slots=True)
    class DefaultStateTransitionFailureCallback:

        def execute(self, now: datetime, service: Service, instance: ServiceInstance, is_liveness_enabled: bool) -> Optional[ServiceInstance]:
            raise NotImplementedError  # TODO: translate from Java
