from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\QueryBuilderInterface.java
# WARNING: Unresolved types: Enum, F, IOException, Pageable

from datetime import datetime
from typing import Any, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.dashboards.column_descriptor import ColumnDescriptor
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_k_p_i import DataFilterKPI


class QueryBuilderInterface(Protocol):
    def date_fields(self) -> set[F]: ...

    def date_filter_field(self) -> F: ...

    def fetch_data(self, tenant_id: str, filter: DataFilter[F, Any], start_date: datetime, end_date: datetime, pageable: Pageable) -> ArrayListTotal[dict[str, Any]]: ...

    def fetch_value(self, tenant_id: str, descriptors: DataFilterKPI[F, Any], start_date: datetime, end_date: datetime, numerator_filter: bool) -> float: ...
