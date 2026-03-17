from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\Key.java
# WARNING: Unresolved types: IOException

from dataclasses import dataclass
from typing import Any

from engine.core.storages.kv.kv_entry import KVEntry
from engine.core.storages.kv.kv_store import KVStore
from engine.plugin.core.kv.kv_purge_behavior import KvPurgeBehavior


@dataclass(slots=True, kw_only=True)
class Key(KvPurgeBehavior):
    type: str = "key"
    expired_only: bool = True

    def entries_to_purge(self, kv_store: KVStore) -> list[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java
