from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\Logs.java
# WARNING: Unresolved types: C, Class, Fields

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.data.i_logs import ILogs
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class Logs(DataFilter):
    """Display Log data in a dashboard chart."""

    def repository_class(self) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def aggregation_forbidden_fields(self) -> set[Fields]:
        raise NotImplementedError  # TODO: translate from Java
