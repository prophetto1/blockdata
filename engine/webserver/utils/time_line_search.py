from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\TimeLineSearch.java

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class TimeLineSearch:
    start_date: datetime | None = None
    end_date: datetime | None = None
    time_range: timedelta | None = None

    @staticmethod
    def extract_from(filters: list[QueryFilter]) -> TimeLineSearch:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_duration(duration: str) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java
