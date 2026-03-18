from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\JobSchedule.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JobSchedule:
    cron: str | None = None
    date: str | None = None
    time: str | None = None
