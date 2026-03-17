from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcServiceLivenessCoordinator.java
# WARNING: Unresolved types: AtomicReference, Exception, ServiceState

from dataclasses import dataclass, field
from logging import logging
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from engine.jdbc.repository.abstract_jdbc_service_instance_repository import AbstractJdbcServiceInstanceRepository
from engine.core.server.abstract_service_liveness_coordinator import AbstractServiceLivenessCoordinator
from engine.jdbc.runner.jdbc_executor import JdbcExecutor
from engine.core.server.server_config import ServerConfig
from engine.core.server.service_instance import ServiceInstance
from engine.core.server.service_registry import ServiceRegistry


@dataclass(slots=True, kw_only=True)
class JdbcServiceLivenessCoordinator(AbstractServiceLivenessCoordinator):
    executor: AtomicReference[JdbcExecutor]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    service_instance_repository: AbstractJdbcServiceInstanceRepository | None = None
    purge_retention: timedelta | None = None

    def on_schedule(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_all_workers_for_unclean_shutdown(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, instance: ServiceInstance, state: ServiceState, reason: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_all_non_responding_services(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def purge_empty_instances(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
