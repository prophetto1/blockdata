from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\FileExistsFunction.java
# WARNING: Unresolved types: EvaluationContext, IOException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.pebble.functions.abstract_file_function import AbstractFileFunction


@dataclass(slots=True, kw_only=True)
class FileExistsFunction(AbstractFileFunction):
    error_message: ClassVar[str] = "The 'fileExists' function expects an argument 'path' that is a path to the internal storage URI."

    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java
