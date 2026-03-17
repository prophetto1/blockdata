from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\ExtensionCustomizer.java
# WARNING: Unresolved types: AttributeResolver, NodeVisitorFactory, Test, TokenParser, extension, pebble, pebbletemplates

from dataclasses import dataclass
from typing import Any, Callable

from engine.core.runners.pebble.extension import Extension


@dataclass(slots=True, kw_only=True)
class ExtensionCustomizer(ExtensionCustomizer):

    def get_filters(self) -> dict[str, Filter]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tests(self) -> dict[str, Test]:
        raise NotImplementedError  # TODO: translate from Java

    def get_functions(self) -> dict[str, Callable]:
        raise NotImplementedError  # TODO: translate from Java

    def get_token_parsers(self) -> list[TokenParser]:
        raise NotImplementedError  # TODO: translate from Java

    def get_binary_operators(self) -> list[Callable]:
        raise NotImplementedError  # TODO: translate from Java

    def get_unary_operators(self) -> list[Callable]:
        raise NotImplementedError  # TODO: translate from Java

    def get_global_variables(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_node_visitors(self) -> list[NodeVisitorFactory]:
        raise NotImplementedError  # TODO: translate from Java

    def get_attribute_resolver(self) -> list[AttributeResolver]:
        raise NotImplementedError  # TODO: translate from Java
