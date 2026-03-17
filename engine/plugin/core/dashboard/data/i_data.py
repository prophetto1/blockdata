from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\IData.java
# WARNING: Unresolved types: Enum, F

from datetime import datetime
from typing import Any, Protocol

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.core.models.query_filter import QueryFilter


class IData(Protocol):
    def where_with_global_filters(self, query_filter_list: list[QueryFilter], start_date: datetime, end_date: datetime, where: list[AbstractFilter[F]]) -> list[AbstractFilter[F]]: ...
