from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\Schedules.java
# WARNING: Unresolved types: ReportingSchedule

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class Schedules:

    @staticmethod
    def every(period: timedelta) -> ReportingSchedule:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def hourly() -> ReportingSchedule:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def daily() -> ReportingSchedule:
        raise NotImplementedError  # TODO: translate from Java
