from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\models\File.java
# WARNING: Unresolved types: AbstractFileObject, FileSystemException, FileType, GenericFileName, IllegalAccessException, NoSuchFieldException, URISyntaxException

from dataclasses import dataclass
from pathlib import Path
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class File:
    server_path: str | None = None
    path: str | None = None
    name: str | None = None
    file_type: FileType | None = None
    symbolic_link: bool | None = None
    size: int | None = None
    user_id: int | None = None
    group_id: int | None = None
    permissions: int | None = None
    flags: int | None = None
    access_date: datetime | None = None
    updated_date: datetime | None = None

    @staticmethod
    def of(file_object: AbstractFileObject[Any]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def server_path(file_object: AbstractFileObject[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_share_for_smb(generic_file_name: GenericFileName) -> str:
        raise NotImplementedError  # TODO: translate from Java
