from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\QueryFilterUtils.java
# WARNING: Unresolved types: Op

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class QueryFilterUtils:

    @staticmethod
    def validate_timeline(filters: list[QueryFilter]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_start_date_filter(filter: QueryFilter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_time_range_filter(filter: QueryFilter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def time_range_operation(filter: QueryFilter) -> QueryFilter.Op:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_updated_start_date_filter(filter: QueryFilter, resolved_start_date: datetime) -> QueryFilter:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def update_filters(filters: list[QueryFilter], resolved_start_date: datetime) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_time_range_with_computed_start_date_filter(filters: list[QueryFilter]) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java
