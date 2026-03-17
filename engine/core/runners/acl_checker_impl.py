from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\AclCheckerImpl.java
# WARNING: Unresolved types: AllowedResources, FlowInfo

from dataclasses import dataclass
from typing import Any

from engine.core.runners.acl_checker import AclChecker
from engine.core.services.namespace_service import NamespaceService
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AclCheckerImpl:
    namespace_service: NamespaceService | None = None
    flow_info: RunContext.FlowInfo | None = None

    def allow_all_namespaces(self) -> AllowedResources:
        raise NotImplementedError  # TODO: translate from Java

    def allow_namespace(self, namespace: str) -> AllowedResources:
        raise NotImplementedError  # TODO: translate from Java

    def allow_namespaces(self, namespaces: list[str]) -> AllowedResources:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AllowAllNamespaces:
        flow_info: RunContext.FlowInfo | None = None
        namespace_service: NamespaceService | None = None

        def check(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AllowNamespace:
        flow_info: RunContext.FlowInfo | None = None
        namespace_service: NamespaceService | None = None
        namespace: str | None = None

        def check(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AllowNamespaces:
        flow_info: RunContext.FlowInfo | None = None
        namespace_service: NamespaceService | None = None
        namespaces: list[str] | None = None

        def check(self) -> None:
            raise NotImplementedError  # TODO: translate from Java
