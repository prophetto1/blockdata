from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\Metrics.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.data.i_metrics import IMetrics
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class Metrics(DataFilter):
    """Metrics are data exposed by tasks after execution."""

    def repository_class(self) -> type[Any]:
        raise NotImplementedError  # TODO: translate from Java
