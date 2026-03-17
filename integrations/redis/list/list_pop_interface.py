from __future__ import annotations

from typing import Any, Protocol
from datetime import timedelta

from integrations.redis.list.list_pop_base_interface import ListPopBaseInterface
from engine.core.models.property.property import Property


class ListPopInterface(ListPopBaseInterface):
    def get_max_records(self) -> Property[int]: ...
    def get_max_duration(self) -> Property[timedelta]: ...
    def get_count(self) -> Property[int]: ...
