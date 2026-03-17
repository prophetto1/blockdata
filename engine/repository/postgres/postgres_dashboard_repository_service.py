from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresDashboardRepositoryService.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.dashboards.dashboard import Dashboard


@dataclass(slots=True, kw_only=True)
class PostgresDashboardRepositoryService(ABC):

    @staticmethod
    def find_condition(jdbc_repository: AbstractJdbcRepository[Dashboard], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
