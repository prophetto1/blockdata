from __future__ import annotations

from typing import Any, Protocol
from datetime import timedelta

from engine.core.models.property.property import Property


class ConsumeInterface(Protocol):
    def get_max_records(self) -> Property[int]: ...
    def get_max_duration(self) -> Property[timedelta]: ...
