from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Blob:
    uri: str | None = None
    container: str | None = None
    name: str | None = None
    size: int | None = None
    last_modified: OffsetDateTime | None = None
    e_tag: str | None = None

    def of(self, blob_client: BlobClient) -> Blob:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, blob_client: BlobClient, blob_properties: BlobProperties) -> Blob:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, container: str, blob_item: BlobItem) -> Blob:
        raise NotImplementedError  # TODO: translate from Java
