from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\kv\KVValueAndMetadata.java

from dataclasses import dataclass
from typing import Any

from engine.core.storages.kv.kv_metadata import KVMetadata
from engine.core.storages.storage_object import StorageObject


@dataclass(slots=True, kw_only=True)
class KVValueAndMetadata:
    metadata: KVMetadata | None = None
    value: Any | None = None

    def metadata_as_map(self) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(storage_object: StorageObject) -> KVValueAndMetadata:
        raise NotImplementedError  # TODO: translate from Java
