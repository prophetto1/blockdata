from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\IsFileEmptyFunction.java
# WARNING: Unresolved types: EvaluationContext, IOException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.pebble.functions.abstract_file_function import AbstractFileFunction


@dataclass(slots=True, kw_only=True)
class IsFileEmptyFunction(AbstractFileFunction):
    error_message: ClassVar[str] = "The 'isFileEmpty' function expects an argument 'path' that is a path to a namespace file or an internal storage URI."

    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java
