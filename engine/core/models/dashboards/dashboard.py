from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\Dashboard.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.charts.chart import Chart
from engine.core.models.has_uid import HasUID
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.dashboards.time_window import TimeWindow


@dataclass(slots=True, kw_only=True)
class Dashboard:
    id: str
    title: str
    time_window: TimeWindow
    deleted: bool = False
    tenant_id: str | None = None
    description: str | None = None
    charts: list[Chart[Any]] | None = None
    created: datetime | None = None
    updated: datetime | None = None
    source_code: str | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def hash_code(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
