from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\namespaces\DisabledInterface.java

from typing import Any, Protocol


class DisabledInterface(Protocol):
    def is_disabled(self) -> bool: ...
