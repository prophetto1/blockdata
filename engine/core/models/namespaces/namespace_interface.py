from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\namespaces\NamespaceInterface.java

from typing import Any, Protocol

from engine.core.models.has_uid import HasUID


class NamespaceInterface(HasUID, Protocol):
    def get_id(self) -> str: ...

    def as_tree(namespace: str) -> list[str]: ...

    def uid(self) -> str: ...
