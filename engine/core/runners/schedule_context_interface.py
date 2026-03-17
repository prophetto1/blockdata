from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ScheduleContextInterface.java

from typing import Any, Callable, Protocol


class ScheduleContextInterface(Protocol):
    def do_in_transaction(self, consumer: Callable[ScheduleContextInterface]) -> None: ...
