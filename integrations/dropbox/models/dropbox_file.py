from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dropbox\src\main\java\io\kestra\plugin\dropbox\models\DropboxFile.java
# WARNING: Unresolved types: Date

from dataclasses import dataclass
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

    @staticmethod
    def of(metadata: Metadata) -> DropboxFile:
        raise NotImplementedError  # TODO: translate from Java
