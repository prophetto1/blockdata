from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\SoftDeletable.java
# WARNING: Unresolved types: T

from typing import Any, Protocol


class SoftDeletable(Protocol):
    def is_deleted(self) -> bool: ...

    def to_deleted(self) -> T: ...
