from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\NamespaceContextTool.java

from dataclasses import dataclass
from typing import Any

from engine.core.services.k_v_store_service import KVStoreService


@dataclass(slots=True, kw_only=True)
class NamespaceContextTool:
    kv_store_service: KVStoreService | None = None

    def get_kv_store_keys(self, namespace: str, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
