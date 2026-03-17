from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\NamespaceFiles.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.file_exist_comportment import FileExistComportment


@dataclass(slots=True, kw_only=True)
class NamespaceFiles:
    enabled: Property[bool]
    namespaces: Property[list[str]]
    if_exists: Property[FileExistComportment]
    folder_per_namespace: Property[bool]
    include: Property[list[str]] | None = None
    exclude: Property[list[str]] | None = None
