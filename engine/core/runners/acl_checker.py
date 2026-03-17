from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\AclChecker.java

from typing import Any, Protocol


class AclChecker(Protocol):
    def allow_all_namespaces(self) -> AllowedResources: ...

    def allow_namespace(self, namespace: str) -> AllowedResources: ...

    def allow_namespaces(self, namespaces: list[str]) -> AllowedResources: ...
