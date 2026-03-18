from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\Type.java

from typing import Any, Protocol


class Type(Protocol):
    def name(self) -> str: ...
