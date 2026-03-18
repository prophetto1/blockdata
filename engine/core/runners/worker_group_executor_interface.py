from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerGroupExecutorInterface.java

from dataclasses import dataclass
from typing import Any, Protocol


class WorkerGroupExecutorInterface(Protocol):
    def is_worker_group_exist_for_key(self, key: str, tenant: str) -> bool: ...

    def is_worker_group_available_for_key(self, key: str) -> bool: ...

    def list_all_worker_group_keys(self) -> set[str]: ...
