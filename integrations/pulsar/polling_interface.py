from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\PollingInterface.java

from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.property.property import Property


class PollingInterface(Protocol):
    def get_poll_duration(self) -> Property[timedelta]: ...
