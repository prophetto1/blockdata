from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\nfs\NfsService.java
# WARNING: Unresolved types: IOException

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True, kw_only=True)
class NfsService:
    instance: NfsService | None = None

    @staticmethod
    def get_instance() -> NfsService:
        raise NotImplementedError  # TODO: translate from Java

    def to_nfs_path(self, path: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_store_type(self, path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java
