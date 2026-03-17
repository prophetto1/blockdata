from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\consumer\EventPositionStrategy.java
# WARNING: Unresolved types: DateTimeFormatter, EventPosition

from dataclasses import dataclass, field
from typing import Any, ClassVar, Protocol


class EventPositionStrategy(Protocol):
    def get(self) -> EventPosition: ...
