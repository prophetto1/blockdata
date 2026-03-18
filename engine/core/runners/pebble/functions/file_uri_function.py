from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\FileURIFunction.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.pebble.functions.abstract_file_function import AbstractFileFunction


@dataclass(slots=True, kw_only=True)
class FileURIFunction(AbstractFileFunction):
    version: ClassVar[str] = "version"
    error_message: ClassVar[str] = "The 'fileURI' function expects an argument 'path' that is a path to a namespace file."

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def file_function(self, context: EvaluationContext, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace_file_uri(self, path: str, namespace: str, tenant_id: str, args: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java
