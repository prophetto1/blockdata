from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\TimeoutConfiguration.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class TimeoutConfiguration:
    read_idle_timeout: Property[timedelta]
    connect_timeout: Property[timedelta] | None = None
