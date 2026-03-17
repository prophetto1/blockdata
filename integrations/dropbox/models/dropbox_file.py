from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.models.metadata import Metadata


@dataclass(slots=True, kw_only=True)
class DropboxFile:
    name: str | None = None
    id: str | None = None
    path: str | None = None
    type: str | None = None
    size: int | None = None
    client_modified: Date | None = None

    def of(self, metadata: Metadata) -> DropboxFile:
        raise NotImplementedError  # TODO: translate from Java
