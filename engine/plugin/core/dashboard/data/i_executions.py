from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\IExecutions.java

from datetime import datetime
from typing import Any, Protocol

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.plugin.core.dashboard.data.i_data import IData
from engine.core.models.query_filter import QueryFilter


class IExecutions(Protocol):
    def where_with_global_filters(self, filters: list[QueryFilter], start_date: datetime, end_date: datetime, where: list[AbstractFilter[Fields]]) -> list[AbstractFilter[Fields]]: ...
