from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\Pauseable.java

from typing import Any, Protocol


class Pauseable(Protocol):
    def pause(self) -> None: ...

    def resume(self) -> None: ...
