from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from pathlib import Path


@dataclass(slots=True, kw_only=True)
class File:
    uri: str | None = None
    local_path: Path | None = None
    name: str | None = None
    parent: str | None = None
    size: int | None = None
    created_date: datetime | None = None
    modified_date: datetime | None = None
    accessed_date: datetime | None = None
    is_directory: bool | None = None

    def from(self, path: Path, attrs: BasicFileAttributes) -> Path:
        raise NotImplementedError  # TODO: translate from Java
