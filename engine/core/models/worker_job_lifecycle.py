from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\WorkerJobLifecycle.java

from typing import Any, Protocol


class WorkerJobLifecycle(Protocol):
    def kill(self) -> None: ...

    def stop(self) -> None: ...
