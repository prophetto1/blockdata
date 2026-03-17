from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\DataFilterKPI.java
# WARNING: Unresolved types: C, Class, Enum, F, core, io, kestra, models

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.filters.abstract_filter import AbstractFilter
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.plugin.core.dashboard.data.i_data import IData
from engine.core.models.annotations.plugin import Plugin
from engine.core.repositories.query_builder_interface import QueryBuilderInterface
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class DataFilterKPI(ABC):
    type: str
    columns: C | None = None
    numerator: list[AbstractFilter[F]] | None = None
    where: list[AbstractFilter[F]] | None = None

    def aggregation_forbidden_fields(self) -> set[F]:
        raise NotImplementedError  # TODO: translate from Java

    def clear_filters(self) -> DataFilterKPI[F, C]:
        raise NotImplementedError  # TODO: translate from Java

    def update_where_with_global_filters(self, query_filter_list: list[QueryFilter], start_date: datetime, end_date: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def repository_class(self) -> Class[Any]:
        ...
