from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\models\Blob.java
# WARNING: Unresolved types: BlobClient, BlobItem, BlobProperties, OffsetDateTime

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Blob:
    uri: str | None = None
    container: str | None = None
    name: str | None = None
    size: int | None = None
    last_modified: OffsetDateTime | None = None
    e_tag: str | None = None

    @staticmethod
    def of(blob_client: BlobClient) -> Blob:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(blob_client: BlobClient, blob_properties: BlobProperties) -> Blob:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(container: str, blob_item: BlobItem) -> Blob:
        raise NotImplementedError  # TODO: translate from Java
