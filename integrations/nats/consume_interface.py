from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\ConsumeInterface.java

from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.property.property import Property


class ConsumeInterface(Protocol):
    def get_max_records(self) -> Property[int]: ...

    def get_max_duration(self) -> Property[timedelta]: ...

    def get_poll_duration(self) -> Property[timedelta]: ...
