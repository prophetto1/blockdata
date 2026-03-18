from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\JobScheduleTimeType.java

from enum import Enum
from typing import Any


class JobScheduleTimeType(str, Enum):
    EVERY_HOUR = "EVERY_HOUR"
    AT_EXACT_HOURS = "AT_EXACT_HOURS"
