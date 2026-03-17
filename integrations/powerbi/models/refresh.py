from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-powerbi\src\main\java\io\kestra\plugin\powerbi\models\Refresh.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Refresh:
    request_id: str | None = None
    refresh_type: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str | None = None
    extended_status: str | None = None
