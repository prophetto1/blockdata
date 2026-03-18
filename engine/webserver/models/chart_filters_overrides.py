from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\ChartFiltersOverrides.java

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class ChartFiltersOverrides:
    filters: list[QueryFilter] = field(default_factory=list)
    start_date: datetime | None = None
    end_date: datetime | None = None
    page_size: int | None = None
    page_number: int | None = None
    namespace: str | None = None
    labels: dict[str, str] | None = None
