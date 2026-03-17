from __future__ import annotations

# Source: E:\KESTRA\storage-local\src\main\java\io\kestra\storage\local\LocalFileAttributes.java
# WARNING: Unresolved types: BasicFileAttributes, FileType, IOException

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.core.storages.file_attributes import FileAttributes


@dataclass(frozen=True, slots=True, kw_only=True)
class LocalFileAttributes:
    file_path: Path | None = None
    basic_file_attributes: BasicFileAttributes | None = None

    def get_file_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_last_modified_time(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_creation_time(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> FileType:
        raise NotImplementedError  # TODO: translate from Java

    def get_size(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_metadata(self) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_metadata(file_path: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java
