from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceRegistry.java
# WARNING: Unresolved types: ConcurrentHashMap, ServiceState

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.server.local_service_state import LocalServiceState
from engine.core.server.service import Service
from engine.core.server.service_type import ServiceType


@dataclass(slots=True, kw_only=True)
class ServiceRegistry:
    services: ConcurrentHashMap[ServiceType, LocalServiceState]

    def register(self, service: LocalServiceState) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def unregister(self, service: LocalServiceState) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def contains_service(self, type: ServiceType) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_service_by_type(self, type: ServiceType) -> Service:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_service_and_get(self, type: ServiceType) -> Service:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, type: ServiceType) -> LocalServiceState:
        raise NotImplementedError  # TODO: translate from Java

    def all(self) -> list[LocalServiceState]:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_service_in_state(self, type: ServiceType, state: Service.ServiceState, max_wait_duration: timedelta) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_empty(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
