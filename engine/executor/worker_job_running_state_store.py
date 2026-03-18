from __future__ import annotations

# Source: E:\KESTRA\executor\src\main\java\io\kestra\executor\WorkerJobRunningStateStore.java

from typing import Any, Protocol


class WorkerJobRunningStateStore(Protocol):
    def delete_by_key(self, key: str) -> None: ...
