from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\DateUtils.java
# WARNING: Unresolved types: OffsetTime

from dataclasses import dataclass
from datetime import date
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.query_filter import QueryFilter


@dataclass(slots=True, kw_only=True)
class DateUtils:

    @staticmethod
    def parse_zoned_date_time(render: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_offset_time(render: str) -> OffsetTime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_local_date(render: str) -> date:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def group_by_type(duration: timedelta) -> GroupType:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def validate_timeline(start_date: datetime, end_date: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def validate_timeline(filters: list[QueryFilter]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse(o: Any) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_end_date_filter(filter: QueryFilter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_start_date_filter(filter: QueryFilter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class GroupType(str, Enum):
        MONTH = "MONTH"
        WEEK = "WEEK"
        DAY = "DAY"
        HOUR = "HOUR"
        MINUTE = "MINUTE"

    class GroupValue(str, Enum):
        MONTH = "MONTH"
        WEEK = "WEEK"
        DAY = "DAY"
        HOUR = "HOUR"
