from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Disposable.java
# WARNING: Unresolved types: AtomicBoolean, Runnable

from typing import Any, Protocol


class Disposable(Protocol):
    def dispose(self) -> None: ...

    def is_disposed(self) -> bool: ...

    def of(disposables: list[Disposable]) -> Disposable: ...

    def of(action: Runnable) -> Disposable: ...
