from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\NamespaceFilesInterface.java

from typing import Any, Protocol

from engine.core.models.tasks.namespace_files import NamespaceFiles


class NamespaceFilesInterface(Protocol):
    def get_namespace_files(self) -> NamespaceFiles: ...
