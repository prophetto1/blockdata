from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\NamespaceContextTool.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.services.kv_store_service import KVStoreService


@dataclass(slots=True, kw_only=True)
class NamespaceContextTool:
    logger: ClassVar[Logger] = getLogger(__name__)
    kv_store_service: KVStoreService | None = None

    def get_kv_store_keys(self, namespace: str, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
