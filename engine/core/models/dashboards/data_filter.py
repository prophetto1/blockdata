from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\DataFilter.java
# WARNING: Unresolved types: C, Class, Enum, F, core, io, kestra, models

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.plugin.core.dashboard.data.i_data import IData
from engine.core.models.dashboards.order_by import OrderBy
from engine.core.models.annotations.plugin import Plugin
from engine.core.repositories.query_builder_interface import QueryBuilderInterface
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class DataFilter:
    type: str
    columns: dict[str, C] | None = None
    where: list[AbstractFilter[F]] | None = None
    order_by: list[OrderBy] | None = None

    def aggregation_forbidden_fields(self) -> set[F]:
        raise NotImplementedError  # TODO: translate from Java

    def update_where_with_global_filters(self, query_filter_list: list[QueryFilter], start_date: datetime, end_date: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def repository_class(self) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java
