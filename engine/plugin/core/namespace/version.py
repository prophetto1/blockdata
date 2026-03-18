from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\namespace\Version.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.namespace.files_purge_behavior import FilesPurgeBehavior
from engine.core.storages.namespace import Namespace
from engine.core.storages.namespace_file import NamespaceFile


@dataclass(slots=True, kw_only=True)
class Version(FilesPurgeBehavior):
    type: str = "version"
    before: str | None = None
    keep_amount: int | None = None

    def entries_to_purge(self, tenant_id: str, namespace_storage: Namespace) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java
