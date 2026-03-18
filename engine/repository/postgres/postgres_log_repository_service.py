from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresLogRepositoryService.java
# WARNING: Unresolved types: jooq, org

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService


@dataclass(slots=True, kw_only=True)
class PostgresLogRepositoryService:

    @staticmethod
    def levels_condition(levels: list[int]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def where(select_condition_step: SelectConditionStep[Record], jdbc_filter_service: JdbcFilterService, filters: list[AbstractFilter[F]], fields_mapping: dict[F, str]) -> SelectConditionStep[org.jooq.Record]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def level_filter(state: list[int]) -> Condition:
        raise NotImplementedError  # TODO: translate from Java
