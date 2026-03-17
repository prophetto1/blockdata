from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Disposable.java

from dataclasses import dataclass
from typing import Any, Callable, Protocol


class Disposable(Protocol):
    def dispose(self) -> None: ...

    def is_disposed(self) -> bool: ...

    def of(disposables: list[Disposable]) -> Disposable: ...
