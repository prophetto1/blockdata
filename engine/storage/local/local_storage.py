from __future__ import annotations

# Source: E:\KESTRA\storage-local\src\main\java\io\kestra\storage\local\LocalStorage.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, ClassVar

from engine.core.storages.file_attributes import FileAttributes
from engine.storage.local.local_file_attributes import LocalFileAttributes
from engine.core.storages.storage_interface import StorageInterface
from engine.core.storages.storage_object import StorageObject


@dataclass(slots=True, kw_only=True)
class LocalStorage:
    base_path: Path
    logger: ClassVar[Logger] = getLogger(__name__)
    max_object_name_length: ClassVar[int] = 255

    def init(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_local_path(self, tenant_id: str, uri: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def get_instance_path(self, uri: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def get_path(self, uri: str, base_path: Path) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, tenant_id: str, namespace: str, uri: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_instance_resource(self, namespace: str, uri: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_with_metadata(self, tenant_id: str, namespace: str, uri: str) -> StorageObject:
        raise NotImplementedError  # TODO: translate from Java

    def all_by_prefix(self, tenant_id: str, namespace: str, prefix: str, include_directories: bool) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def exists(self, tenant_id: str, namespace: str, uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, tenant_id: str, namespace: str, uri: str) -> list[FileAttributes]:
        raise NotImplementedError  # TODO: translate from Java

    def list_instance_resource(self, namespace: str, uri: str) -> list[FileAttributes]:
        raise NotImplementedError  # TODO: translate from Java

    def put(self, tenant_id: str, namespace: str, uri: str, storage_object: StorageObject) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_instance_resource(self, namespace: str, uri: str, storage_object: StorageObject) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def put_file(uri: str, storage_object: StorageObject, file: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes(self, tenant_id: str, namespace: str, uri: str) -> FileAttributes:
        raise NotImplementedError  # TODO: translate from Java

    def get_instance_attributes(self, namespace: str, uri: str) -> FileAttributes:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_attribute_from_path(path: Path) -> LocalFileAttributes:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory(self, tenant_id: str, namespace: str, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_instance_directory(self, namespace: str, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_directory_from_path(path: Path, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def move(self, tenant_id: str, namespace: str, from: str, to: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, tenant_id: str, namespace: str, uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def delete_instance_resource(self, namespace: str, uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def delete_from_path(path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix(self, tenant_id: str, namespace: str, storage_prefix: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_kestra_uri(self, tenant_id: str, path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def sub_path_parent_guard(self, path: Path, prefix: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java
