from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\data\Triggers.java
# WARNING: Unresolved types: C, Class, Fields

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.data_filter import DataFilter
from engine.plugin.core.dashboard.data.i_triggers import ITriggers
from engine.core.repositories.query_builder_interface import QueryBuilderInterface


@dataclass(slots=True, kw_only=True)
class Triggers(DataFilter):
    """Display Execution data in a dashboard chart."""

    def repository_class(self) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java
