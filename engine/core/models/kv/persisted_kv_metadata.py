from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\kv\PersistedKvMetadata.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from typing import Any, ClassVar

from engine.core.models.has_uid import HasUID
from engine.core.storages.kv.kv_entry import KVEntry
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class PersistedKvMetadata:
    namespace: str
    name: str
    version: int
    logger: ClassVar[Logger] = getLogger(__name__)
    last: bool = True
    tenant_id: str | None = None
    description: str | None = None
    expiration_date: datetime | None = None
    created: datetime | None = None
    updated: datetime | None = None
    deleted: bool | None = None

    @staticmethod
    def from(tenant_id: str, kv_entry: KVEntry) -> PersistedKvMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def as_last(self) -> PersistedKvMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> PersistedKvMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
