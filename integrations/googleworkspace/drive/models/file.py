from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from pathlib import Path


@dataclass(slots=True, kw_only=True)
class File:
    id: str | None = None
    name: str | None = None
    size: int | None = None
    version: int | None = None
    mime_type: str | None = None
    created_time: datetime | None = None
    parents: list[String] | None = None
    trashed: bool | None = None

    def of(self, file: com) -> Path:
        raise NotImplementedError  # TODO: translate from Java
