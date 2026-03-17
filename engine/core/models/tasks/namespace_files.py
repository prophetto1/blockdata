from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\NamespaceFiles.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.file_exist_comportment import FileExistComportment
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class NamespaceFiles:
    enabled: Property[bool] = Property.ofValue(true)
    namespaces: Property[list[str]] = Property.ofExpression("""
        ["{{flow.namespace}}"]""")
    if_exists: Property[FileExistComportment] = Property.ofValue(FileExistComportment.OVERWRITE)
    folder_per_namespace: Property[bool] = Property.ofValue(false)
    include: Property[list[str]] | None = None
    exclude: Property[list[str]] | None = None
