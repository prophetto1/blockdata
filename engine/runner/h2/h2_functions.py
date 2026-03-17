from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2Functions.java
# WARNING: Unresolved types: Function, JsonNode, Scope, T

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class H2Functions:
    scope: ClassVar[Scope] = Scope.newEmptyScope()

    @staticmethod
    def jq_boolean(value: str, expression: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq_string(value: str, expression: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq_string_array(value: str, expression: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq_long(value: str, expression: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq_integer(value: str, expression: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq_double(value: str, expression: str) -> float:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq(value: str, expression: str) -> list[JsonNode]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq(value: str, expression: str, function: Function[JsonNode, T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def jq_array(value: str, expression: str, function: Function[JsonNode, T]) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java
