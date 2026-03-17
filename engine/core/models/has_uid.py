from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\HasUID.java

from typing import Any, Protocol


class HasUID(Protocol):
    def uid(self) -> str: ...
