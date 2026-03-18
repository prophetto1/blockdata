from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\Flows.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.data.i_flows import IFlows
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class Flows(DataFilter):
    """Display Flow data in a dashboard chart."""

    def repository_class(self) -> type[Any]:
        raise NotImplementedError  # TODO: translate from Java
