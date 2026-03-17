from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\Version.java
# WARNING: Unresolved types: IOException

from dataclasses import dataclass
from typing import Any

from engine.core.storages.kv.k_v_entry import KVEntry
from engine.core.storages.kv.k_v_store import KVStore
from engine.plugin.core.kv.kv_purge_behavior import KvPurgeBehavior


@dataclass(slots=True, kw_only=True)
class Version(KvPurgeBehavior):
    type: str = "version"
    before: str | None = None
    keep_amount: int | None = None

    def entries_to_purge(self, kv_store: KVStore) -> list[KVEntry]:
        raise NotImplementedError  # TODO: translate from Java
