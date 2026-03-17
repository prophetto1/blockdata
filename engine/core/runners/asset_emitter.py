from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\AssetEmitter.java

from typing import Any, Protocol

from engine.core.runners.asset_emit import AssetEmit
from engine.core.queues.queue_exception import QueueException


class AssetEmitter(Protocol):
    def emit(self, asset_emit: AssetEmit) -> None: ...

    def emitted(self) -> list[AssetEmit]: ...
