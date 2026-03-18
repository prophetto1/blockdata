from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\list\ListPopInterface.java

from datetime import timedelta
from typing import Any, Protocol

from integrations.redis.list.list_pop_base_interface import ListPopBaseInterface
from engine.core.models.property.property import Property


class ListPopInterface(ListPopBaseInterface, Protocol):
    def get_max_records(self) -> Property[int]: ...

    def get_max_duration(self) -> Property[timedelta]: ...

    def get_count(self) -> Property[int]: ...
