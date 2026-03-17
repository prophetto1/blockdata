from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\DefaultNamespaceService.java

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.services.namespace_service import NamespaceService


@dataclass(slots=True, kw_only=True)
class DefaultNamespaceService:
    flow_repository: Optional[FlowRepositoryInterface] | None = None

    def is_namespace_exists(self, tenant: str, namespace: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def check_allowed_namespace(self, tenant: str, namespace: str, from_tenant: str, from_namespace: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_allowed_all_namespaces(self, tenant: str, from_tenant: str, from_namespace: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
