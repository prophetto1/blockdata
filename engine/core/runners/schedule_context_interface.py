from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ScheduleContextInterface.java
# WARNING: Unresolved types: Consumer

from typing import Any, Protocol


class ScheduleContextInterface(Protocol):
    def do_in_transaction(self, consumer: Consumer[ScheduleContextInterface]) -> None: ...
