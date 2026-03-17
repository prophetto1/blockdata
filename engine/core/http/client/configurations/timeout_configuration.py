from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\TimeoutConfiguration.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class TimeoutConfiguration:
    read_idle_timeout: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))
    connect_timeout: Property[timedelta] | None = None
