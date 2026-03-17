from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\ServiceInstanceRepositoryInterface.java
# WARNING: Unresolved types: Function, Pageable, ServiceState

from datetime import datetime
from typing import Any, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance
from engine.core.server.service_type import ServiceType


class ServiceInstanceRepositoryInterface(Protocol):
    def find_by_id(self, id: str) -> Optional[ServiceInstance]: ...

    def find_all(self) -> list[ServiceInstance]: ...

    def find(self, pageable: Pageable, states: set[Service.ServiceState], types: set[ServiceType]) -> ArrayListTotal[ServiceInstance]: ...

    def delete(self, service: ServiceInstance) -> None: ...

    def save(self, service: ServiceInstance) -> ServiceInstance: ...

    def find_all_instances_in_state(self, state: Service.ServiceState) -> list[ServiceInstance]: ...

    def find_all_instances_in_states(self, states: set[Service.ServiceState]) -> list[ServiceInstance]: ...

    def find_all_instances_between(self, type: ServiceType, from: datetime, to: datetime) -> list[ServiceInstance]: ...

    def purge_empty_instances(self, until: datetime) -> int: ...

    def sort_mapping(self) -> Function[str, str]: ...
