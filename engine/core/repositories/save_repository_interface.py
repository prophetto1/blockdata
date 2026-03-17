from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\SaveRepositoryInterface.java

from typing import Any, Protocol


class SaveRepositoryInterface(Protocol):
    def save(self, item: T) -> T: ...

    def save_batch(self, items: list[T]) -> int: ...
