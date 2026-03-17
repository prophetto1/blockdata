from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\FileURIFunction.java
# WARNING: Unresolved types: EvaluationContext, IOException

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.functions.abstract_file_function import AbstractFileFunction


@dataclass(slots=True, kw_only=True)
class FileURIFunction(AbstractFileFunction):
    v_e_r_s_i_o_n: str = "version"
    e_r_r_o_r__m_e_s_s_a_g_e: str = "The 'fileURI' function expects an argument 'path' that is a path to a namespace file."

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace_file_u_r_i(self, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_error_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
