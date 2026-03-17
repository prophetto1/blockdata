from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\NamespaceFileController.java
# WARNING: Unresolved types: BufferedInputStream, CompletedFileUpload, Exception, IOException, Pair, Pattern, StreamedFile, URISyntaxException

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.storages.file_attributes import FileAttributes
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.services.flow_service import FlowService
from engine.core.http.http_response import HttpResponse
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.repositories.namespace_file_metadata_repository_interface import NamespaceFileMetadataRepositoryInterface
from engine.core.storages.namespace_file_revision import NamespaceFileRevision
from engine.core.storages.storage_interface import StorageInterface
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class NamespaceFileController:
    forbidden_path_patterns: list[Pattern]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    flows_folder: ClassVar[str] = "_flows"
    storage_interface: StorageInterface | None = None
    tenant_service: TenantService | None = None
    flow_service: FlowService | None = None
    namespace_factory: NamespaceFactory | None = None
    namespace_file_metadata_repository: NamespaceFileMetadataRepositoryInterface | None = None

    def search_namespace_files(self, namespace: str, q: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_content(self, namespace: str, path: str, revision: int) -> HttpResponse[StreamedFile]:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_metadatas(self, namespace: str, path: str) -> FileAttributes:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_revisions(self, namespace: str, path: str) -> list[NamespaceFileRevision]:
        raise NotImplementedError  # TODO: translate from Java

    def list_namespace_directory_files(self, namespace: str, path: str) -> list[FileAttributes]:
        raise NotImplementedError  # TODO: translate from Java

    def create_namespace_directory(self, namespace: str, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_namespace_file(self, namespace: str, path: str, file_content: CompletedFileUpload) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def inner_create_namespace_file(self, namespace: str, path: str, file_content: CompletedFileUpload) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def put_namespace_file(self, tenant_id: str, namespace: str, path: str, input_stream: BufferedInputStream) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def import_flow(self, tenant_id: str, source: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def export_namespace_files(self, namespace: str) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def move_file_directory(self, namespace: str, from: str, to: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def inner_move_file_directory(self, namespace: str, from: str, to: str) -> list[Pair[NamespaceFile, NamespaceFile]]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_file_directory(self, namespace: str, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def inner_delete_file_directory(self, namespace: str, path: str) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def forbidden_paths_guard(self, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def ensure_writable_namespace_file(self, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
