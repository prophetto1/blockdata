from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\NamespaceFileMetadataRepositoryInterface.java

from typing import Any, Optional, Protocol

from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.fetch_version import FetchVersion
from engine.core.models.namespaces.files.namespace_file_metadata import NamespaceFileMetadata
from engine.core.models.query_filter import QueryFilter
from engine.core.repositories.save_repository_interface import SaveRepositoryInterface


class NamespaceFileMetadataRepositoryInterface(SaveRepositoryInterface, Protocol):
    def find_by_path(self, tenant_id: str, namespace: str, path: str) -> Optional[NamespaceFileMetadata]: ...

    def find(self, pageable: Pageable, tenant_id: str, filters: list[QueryFilter], allow_deleted: bool, fetch_behavior: FetchVersion | None = None) -> ArrayListTotal[NamespaceFileMetadata]: ...

    def delete(self, namespace_file_metadata: NamespaceFileMetadata) -> NamespaceFileMetadata: ...

    def purge(self, namespace_files_metadata: list[NamespaceFileMetadata]) -> int: ...
