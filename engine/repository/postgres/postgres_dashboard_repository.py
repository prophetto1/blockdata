from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresDashboardRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_dashboard_repository import AbstractJdbcDashboardRepository
from engine.core.events.crud_event import CrudEvent
from engine.core.models.dashboards.dashboard import Dashboard
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class PostgresDashboardRepository(AbstractJdbcDashboardRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
