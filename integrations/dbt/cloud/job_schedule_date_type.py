from __future__ import annotations

from enum import Enum
from typing import Any


class JobScheduleDateType(str, Enum):
    EVERY_DAY = "EVERY_DAY"
    DAYS_OF_WEEK = "DAYS_OF_WEEK"
    CUSTOM_CRON = "CUSTOM_CRON"
