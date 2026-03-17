from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2DashboardRepository.java
# WARNING: Unresolved types: ApplicationEventPublisher

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_dashboard_repository import AbstractJdbcDashboardRepository
from engine.core.models.conditions.condition import Condition
from engine.core.events.crud_event import CrudEvent
from engine.core.models.dashboards.dashboard import Dashboard
from engine.repository.h2.h2_repository import H2Repository
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class H2DashboardRepository(AbstractJdbcDashboardRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
