from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\metadata\MetadataMigrationService.java

from dataclasses import dataclass
from typing import Any, Callable

from engine.core.storages.file_attributes import FileAttributes
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.repositories.kv_metadata_repository_interface import KvMetadataRepositoryInterface
from engine.core.repositories.namespace_file_metadata_repository_interface import NamespaceFileMetadataRepositoryInterface
from engine.core.storages.storage_interface import StorageInterface
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class MetadataMigrationService:
    flow_repository: FlowRepositoryInterface | None = None
    tenant_service: TenantService | None = None
    kv_metadata_repository: KvMetadataRepositoryInterface | None = None
    namespace_file_metadata_repository: NamespaceFileMetadataRepositoryInterface | None = None
    storage_interface: StorageInterface | None = None
    kestra_config: KestraConfig | None = None

    def namespaces_per_tenant(self) -> dict[str, list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def kv_migration(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def ns_files_migration(self, verbose: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def secret_migration(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def list_all_from_storage(storage: StorageInterface, prefix_function: Callable[str, str], tenant: str, namespace: str) -> list[PathAndAttributes]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PathAndAttributes:
        path: str | None = None
        attributes: FileAttributes | None = None
