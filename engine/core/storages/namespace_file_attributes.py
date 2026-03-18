from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\NamespaceFileAttributes.java
# WARNING: Unresolved types: FileType

from dataclasses import dataclass
from typing import Any

from engine.core.storages.file_attributes import FileAttributes
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata


@dataclass(slots=True, kw_only=True)
class NamespaceFileAttributes:
    namespace_file_metadata: NamespaceFileMetadata | None = None

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
