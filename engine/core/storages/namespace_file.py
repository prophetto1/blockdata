from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\NamespaceFile.java

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata


@dataclass(slots=True, kw_only=True)
class NamespaceFile:
    capture_path_without_version: ClassVar[re.Pattern]
    path: str | None = None
    uri: str | None = None
    namespace: str | None = None
    version: int | None = None

    @staticmethod
    def of(namespace: str, uri: str | None = None, version: int | None = None) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_metadata(metadata: NamespaceFileMetadata) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def normalize(path: Path) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def file_path(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def storage_path(self) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_directory(path: str | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_root_directory(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_logical_path(path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java
