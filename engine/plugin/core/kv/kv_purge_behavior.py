from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\KvPurgeBehavior.java
# WARNING: Unresolved types: IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.storages.kv.k_v_entry import KVEntry
from engine.core.storages.kv.k_v_store import KVStore
from engine.plugin.core.kv.key import Key
from engine.core.utils.version import Version


@dataclass(slots=True, kw_only=True)
class KvPurgeBehavior(ABC):

    @abstractmethod
    def get_type(self) -> str:
        ...

    @abstractmethod
    def entries_to_purge(self, kv_store: KVStore) -> list[KVEntry]:
        ...
