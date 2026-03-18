from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\local\models\File.java
# WARNING: Unresolved types: BasicFileAttributes

from dataclasses import dataclass
from pathlib import Path
from datetime import datetime
from typing import Any


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

    @staticmethod
    def from(path: Path, attrs: BasicFileAttributes) -> Path:
        raise NotImplementedError  # TODO: translate from Java
