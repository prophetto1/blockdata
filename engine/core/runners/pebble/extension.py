from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\Extension.java
# WARNING: Unresolved types: AbstractExtension, NodeVisitorFactory, Test, TokenParser

from dataclasses import dataclass
from typing import Any, Callable

from engine.core.runners.pebble.functions.error_logs_function import ErrorLogsFunction
from engine.core.runners.pebble.functions.file_exists_function import FileExistsFunction
from engine.core.runners.pebble.functions.file_size_function import FileSizeFunction
from engine.core.runners.pebble.functions.file_uri_function import FileURIFunction
from engine.core.runners.pebble.functions.http_function import HttpFunction
from engine.core.runners.pebble.functions.is_file_empty_function import IsFileEmptyFunction
from engine.core.runners.pebble.functions.kv_function import KvFunction
from engine.core.runners.pebble.functions.read_file_function import ReadFileFunction
from engine.core.runners.pebble.functions.render_function import RenderFunction
from engine.core.runners.pebble.functions.render_once_function import RenderOnceFunction
from engine.core.runners.pebble.functions.secret_function import SecretFunction


@dataclass(slots=True, kw_only=True)
class Extension(AbstractExtension):
    secret_function: SecretFunction | None = None
    kv_function: KvFunction | None = None
    read_file_function: ReadFileFunction | None = None
    file_uri_function: FileURIFunction | None = None
    render_function: RenderFunction | None = None
    render_once_function: RenderOnceFunction | None = None
    file_size_function: FileSizeFunction | None = None
    is_file_empty_function: IsFileEmptyFunction | None = None
    file_exists_function: FileExistsFunction | None = None
    error_logs_function: ErrorLogsFunction | None = None
    http_function: HttpFunction | None = None

    def get_token_parsers(self) -> list[TokenParser]:
        raise NotImplementedError  # TODO: translate from Java

    def get_unary_operators(self) -> list[Callable]:
        raise NotImplementedError  # TODO: translate from Java

    def get_binary_operators(self) -> list[Callable]:
        raise NotImplementedError  # TODO: translate from Java

    def get_filters(self) -> dict[str, Filter]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tests(self) -> dict[str, Test]:
        raise NotImplementedError  # TODO: translate from Java

    def get_functions(self) -> dict[str, Callable]:
        raise NotImplementedError  # TODO: translate from Java

    def get_global_variables(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_node_visitors(self) -> list[NodeVisitorFactory]:
        raise NotImplementedError  # TODO: translate from Java
