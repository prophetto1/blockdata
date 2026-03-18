from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\models\File.java
# WARNING: Unresolved types: api, com, drive, google, model, services

from dataclasses import dataclass
from pathlib import Path
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class File:
    id: str | None = None
    name: str | None = None
    size: int | None = None
    version: int | None = None
    mime_type: str | None = None
    created_time: datetime | None = None
    parents: list[str] | None = None
    trashed: bool | None = None

    @staticmethod
    def of(file: com.google.api.services.drive.model.File) -> Path:
        raise NotImplementedError  # TODO: translate from Java
