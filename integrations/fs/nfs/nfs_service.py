from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path


@dataclass(slots=True, kw_only=True)
class NfsService:
    instance: NfsService | None = None

    def get_instance(self) -> NfsService:
        raise NotImplementedError  # TODO: translate from Java

    def to_nfs_path(self, path: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_store_type(self, path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java
