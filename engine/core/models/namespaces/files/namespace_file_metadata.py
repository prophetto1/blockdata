from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\namespaces\files\NamespaceFileMetadata.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from typing import Any, ClassVar

from engine.core.storages.file_attributes import FileAttributes
from engine.core.models.has_uid import HasUID
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class NamespaceFileMetadata:
    namespace: str
    path: str
    version: int
    size: int
    created: datetime
    logger: ClassVar[Logger] = getLogger(__name__)
    last: bool = True
    tenant_id: str | None = None
    parent_path: str | None = None
    updated: datetime | None = None
    deleted: bool | None = None

    @staticmethod
    def path(path: str, trailing_slash: bool | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parent_path(path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(tenant_id: str, namespace: str, path: str | None = None, file_attributes: FileAttributes | None = None) -> NamespaceFileMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def as_last(self) -> NamespaceFileMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> NamespaceFileMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_directory(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
