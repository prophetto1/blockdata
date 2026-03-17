from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\VariablesService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.output import Output
from engine.core.storages.storage_context import StorageContext
from engine.core.models.executions.variables import Variables


@dataclass(slots=True, kw_only=True)
class VariablesService:

    def of(self, context: StorageContext, outputs: Output) -> Variables:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, context: StorageContext, outputs: dict[str, Any]) -> Variables:
        raise NotImplementedError  # TODO: translate from Java
