from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\IFlows.java

from enum import Enum
from datetime import datetime
from typing import Any, Protocol

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.plugin.core.dashboard.data.i_data import IData
from engine.core.models.query_filter import QueryFilter


class IFlows(IData, Protocol):
    def where_with_global_filters(self, filters: list[QueryFilter], start_date: datetime, end_date: datetime, where: list[AbstractFilter[IFlows.Fields]]) -> list[AbstractFilter[IFlows.Fields]]: ...
