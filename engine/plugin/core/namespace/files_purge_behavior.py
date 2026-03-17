from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\namespace\FilesPurgeBehavior.java
# WARNING: Unresolved types: IOException

from dataclasses import dataclass
from typing import Any

from engine.core.storages.namespace import Namespace
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.utils.version import Version


@dataclass(slots=True, kw_only=True)
class FilesPurgeBehavior:

    def get_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def entries_to_purge(self, tenant_id: str, namespace_storage: Namespace) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java
