from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresServiceInstanceRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_service_instance_repository import AbstractJdbcServiceInstanceRepository
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.server.service_instance import ServiceInstance


@dataclass(slots=True, kw_only=True)
class PostgresServiceInstanceRepository(AbstractJdbcServiceInstanceRepository):
    pass
