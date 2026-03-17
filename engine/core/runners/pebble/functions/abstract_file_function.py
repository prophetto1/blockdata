from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\AbstractFileFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, IOException, Pattern, PebbleTemplate

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.local_path_factory import LocalPathFactory
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.services.namespace_service import NamespaceService
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class AbstractFileFunction(ABC):
    uri_pattern: ClassVar[Pattern]
    execution_file: ClassVar[Pattern]
    scheme_not_supported_error: ClassVar[str] = "Cannot process the URI %s: scheme not supported."
    kestra_scheme: ClassVar[str] = "kestra:///"
    trigger: ClassVar[str] = "trigger"
    namespace: ClassVar[str] = "namespace"
    tenant_id: ClassVar[str] = "tenantId"
    id: ClassVar[str] = "id"
    path: ClassVar[str] = "path"
    namespace_service: NamespaceService | None = None
    storage_interface: StorageInterface | None = None
    local_path_factory: LocalPathFactory | None = None
    namespace_factory: NamespaceFactory | None = None
    enable_file_protocol: bool | None = None

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_error_message(self) -> str:
        ...

    @abstractmethod
    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        ...

    def is_file_uri_valid(self, namespace: str, flow_id: str, execution_id: str, path: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def check_allowed_file_and_return_namespace(self, context: EvaluationContext, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_file_from_parent_execution(self, context: EvaluationContext, path: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def check_if_file_from_allowed_namespace_and_return_it(self, path: str, tenant_id: str, from_namespace: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def check_enabled_local_file_and_return_namespace(self, args: dict[str, Any], flow: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def checked_allowed_namespace_and_return_namespace(self, args: dict[str, Any], ns_file_uri: str, tenant_id: str, flow: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_namespace(self, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
