from __future__ import annotations

from typing import Any, Protocol
from datetime import timedelta

from engine.core.models.property.property import Property


class PollingInterface(Protocol):
    def get_poll_duration(self) -> Property[timedelta]: ...
