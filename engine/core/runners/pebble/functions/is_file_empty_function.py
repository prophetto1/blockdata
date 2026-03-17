from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\IsFileEmptyFunction.java
# WARNING: Unresolved types: EvaluationContext, IOException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.pebble.functions.abstract_file_function import AbstractFileFunction


@dataclass(slots=True, kw_only=True)
class IsFileEmptyFunction(AbstractFileFunction):
    e_r_r_o_r__m_e_s_s_a_g_e: ClassVar[str] = "The 'isFileEmpty' function expects an argument 'path' that is a path to a namespace file or an internal storage URI."

    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_error_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
