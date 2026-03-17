from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\InternalNamespace.java
# WARNING: Unresolved types: Conflicts, FileNotFoundException, Pair, URISyntaxException

from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, Callable, ClassVar, Optional

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.fetch_version import FetchVersion
from engine.core.storages.file_attributes import FileAttributes
from engine.core.models.namespaces.namespace import Namespace
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata
from engine.core.repositories.namespace_file_metadata_repository_interface import NamespaceFileMetadataRepositoryInterface
from engine.core.models.query_filter import QueryFilter
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class InternalNamespace:
    logger: ClassVar[Logger] = getLogger(__name__)
    namespace: str | None = None
    tenant: str | None = None
    storage: StorageInterface | None = None
    namespace_file_metadata_repository: NamespaceFileMetadataRepositoryInterface | None = None
    logger: Any | None = None

    def find(self, pageable: Pageable, filters: list[QueryFilter], allow_deleted: bool, fetch_version: FetchVersion) -> ArrayListTotal[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def namespace(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def tenant_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def all(self, containing: str | None = None, include_directories: bool | None = None) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def children(self, parent_path: str, recursive: bool) -> list[NamespaceFileMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def move(self, source: Path, target: Path) -> list[Pair[NamespaceFile, NamespaceFile]]:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, path: Path) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    def relativize(self, uri: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_files_matching(self, predicate: Callable[Path]) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_content(self, path: Path, version: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_metadata(self, path: Path) -> FileAttributes:
        raise NotImplementedError  # TODO: translate from Java

    def file_not_found(self, path: Path, version: int) -> FileNotFoundException:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_path(self, path: Path, allow_deleted: bool | None = None, version: int | None = None) -> Optional[NamespaceFileMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def exists(self, path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, path: Path, content: Any, on_already_exist: Conflicts) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def mk_dirs(self, path: str) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory(self, path: Path) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, path: Path) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, namespace_file: NamespaceFile) -> bool:
        raise NotImplementedError  # TODO: translate from Java
