from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\domain\ServerInfo.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class ServerInfo:
    version: str | None = None
    commit: str | None = None
    commit_date: datetime | None = None
    type: str | None = None
