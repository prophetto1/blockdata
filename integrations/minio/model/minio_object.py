from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.microsoft365.sharepoint.models.item import Item
from integrations.minio.model.owner import Owner


@dataclass(slots=True, kw_only=True)
class MinioObject:
    uri: str | None = None
    key: str | None = None
    etag: str | None = None
    size: int | None = None
    last_modified: datetime | None = None
    owner: Owner | None = None

    def of(self, object: Item) -> MinioObject:
        raise NotImplementedError  # TODO: translate from Java
