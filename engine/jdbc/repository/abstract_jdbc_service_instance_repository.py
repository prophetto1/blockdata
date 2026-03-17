from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcServiceInstanceRepository.java
# WARNING: Unresolved types: Configuration, DSLContext, Field, Function, ImmutablePair, Pageable, Record, Response, ServiceState, T, TransactionalCallable, TransactionalRunnable, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import logging
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance
from engine.core.repositories.service_instance_repository_interface import ServiceInstanceRepositoryInterface
from engine.core.server.service_liveness_store import ServiceLivenessStore
from engine.core.server.service_liveness_updater import ServiceLivenessUpdater
from engine.core.server.service_state_transition import ServiceStateTransition
from engine.core.server.service_type import ServiceType
from engine.plugin.core.dashboard.chart.table import Table


@dataclass(slots=True, kw_only=True)
class AbstractJdbcServiceInstanceRepository(ABC, AbstractJdbcRepository):
    state: ClassVar[Field[Any]]
    type: ClassVar[Field[Any]]
    updated_at: ClassVar[Field[datetime]]
    created_at: ClassVar[Field[datetime]]
    service_id: ClassVar[Field[Any]]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[ServiceInstance] | None = None

    def find_by_id(self, id: str) -> Optional[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, id: str, configuration: Configuration, is_for_update: bool) -> Optional[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_instances_in_state(self, state: Service.ServiceState) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_instances_in_states(self, states: set[Service.ServiceState]) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_instances_between(self, type: ServiceType, from: datetime, to: datetime) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_instances_in_states(self, configuration: Configuration, states: set[Service.ServiceState], is_for_update: bool) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_non_running_instances(self) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_non_running_instances(self, configuration: Configuration, is_for_update: bool) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_instances_in_not_running_state(self) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_instances_in_not_running_state(self, configuration: Configuration, is_for_update: bool) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def purge_empty_instances(self, until: datetime) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def transaction(self, runnable: TransactionalRunnable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def transaction_result(self, runnable: TransactionalCallable[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, context: DSLContext, instance: ServiceInstance) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, instance: ServiceInstance) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, instance: ServiceInstance) -> ServiceInstance:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, instance: ServiceInstance) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self) -> list[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, pageable: Pageable, states: set[Service.ServiceState], types: set[ServiceType]) -> ArrayListTotal[ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, instance: ServiceInstance, new_state: Service.ServiceState, reason: str) -> ServiceStateTransition.Response:
        raise NotImplementedError  # TODO: translate from Java

    def may_transit_service_to(self, configuration: Configuration, instance: ServiceInstance, new_state: Service.ServiceState, reason: str) -> ServiceStateTransition.Response:
        raise NotImplementedError  # TODO: translate from Java

    def may_update_status_by_id(self, configuration: Configuration, instance: ServiceInstance, new_state: Service.ServiceState, reason: str) -> ImmutablePair[ServiceInstance, ServiceInstance]:
        raise NotImplementedError  # TODO: translate from Java

    def table(self) -> Table[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def sort_mapping(self) -> Function[str, str]:
        raise NotImplementedError  # TODO: translate from Java
