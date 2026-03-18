from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlDashboardRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_dashboard_repository import AbstractJdbcDashboardRepository
from engine.core.events.crud_event import CrudEvent
from engine.core.models.dashboards.dashboard import Dashboard
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class MysqlDashboardRepository(AbstractJdbcDashboardRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
