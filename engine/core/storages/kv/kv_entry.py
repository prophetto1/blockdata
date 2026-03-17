from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\kv\KVEntry.java
# WARNING: Unresolved types: IOException, Pattern

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.core.storages.file_attributes import FileAttributes
from engine.core.models.kv.persisted_kv_metadata import PersistedKvMetadata


@dataclass(slots=True, kw_only=True)
class KVEntry:
    capture_key_and_version: ClassVar[Pattern]
    namespace: str | None = None
    key: str | None = None
    version: int | None = None
    description: str | None = None
    creation_date: datetime | None = None
    update_date: datetime | None = None
    expiration_date: datetime | None = None

    @staticmethod
    def from(namespace: str, file_attributes: FileAttributes) -> KVEntry:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(persisted_kv_metadata: PersistedKvMetadata) -> KVEntry:
        raise NotImplementedError  # TODO: translate from Java
