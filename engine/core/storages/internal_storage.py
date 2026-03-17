from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\InternalStorage.java
# WARNING: Unresolved types: IOException, InputStream, Logger

from dataclasses import dataclass
from pathlib import Path
from datetime import timedelta
from typing import Any

from engine.core.storages.file_attributes import FileAttributes
from engine.core.models.namespaces.namespace import Namespace
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.services.namespace_service import NamespaceService
from engine.core.storages.storage import Storage
from engine.core.storages.storage_context import StorageContext
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class InternalStorage:
    p_a_t_h__s_e_p_a_r_a_t_o_r: str = "/"
    logger: Logger | None = None
    context: StorageContext | None = None
    storage: StorageInterface | None = None
    namespace_factory: NamespaceFactory | None = None
    namespace_service: NamespaceService | None = None

    def namespace(self) -> Namespace:
        raise NotImplementedError  # TODO: translate from Java

    def namespace(self, namespace: str) -> Namespace:
        raise NotImplementedError  # TODO: translate from Java

    def is_file_exist(self, uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_file(self, uri: str) -> InputStream:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes(self, uri: str) -> FileAttributes:
        raise NotImplementedError  # TODO: translate from Java

    def delete_file(self, uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uri_guard(uri: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_execution_files(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_context_base_u_r_i(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, input_stream: InputStream, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, input_stream: InputStream, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, file: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, file: Path, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_cache_file(self, cache_id: str, object_id: str, ttl: timedelta) -> Optional[InputStream]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cache_file_last_modified_time(self, cache_id: str, object_id: str) -> Optional[int]:
        raise NotImplementedError  # TODO: translate from Java

    def put_cache_file(self, file: Path, cache_id: str, object_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def delete_cache_file(self, cache_id: str, object_id: str) -> Optional[bool]:
        raise NotImplementedError  # TODO: translate from Java

    def put_file_and_delete(self, file: Path, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file_and_delete(self, file: Path, prefix: str, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, input_stream: InputStream, prefix: str, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_task_storage_context(self) -> Optional[StorageContext.Task]:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, uri: str) -> list[FileAttributes]:
        raise NotImplementedError  # TODO: translate from Java
