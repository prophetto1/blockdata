from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.minio.model.owner import Owner


@dataclass(slots=True, kw_only=True)
class S3Object:
    uri: str | None = None
    key: str | None = None
    etag: str | None = None
    size: int | None = None
    last_modified: datetime | None = None
    owner: Owner | None = None

    def of(self, object: software) -> S3Object:
        raise NotImplementedError  # TODO: translate from Java
