from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\YamlParser.java
# WARNING: Unresolved types: Class, ConstraintViolationException, JsonProcessingException, ObjectMapper, T

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class YamlParser:
    strict_mapper: ClassVar[ObjectMapper]
    non_strict_mapper: ClassVar[ObjectMapper]

    @staticmethod
    def is_valid_extension(path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse(input: str, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse(input: str, cls: Class[T], strict: bool) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse(input: dict[str, Any], cls: Class[T], strict: bool) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def type(cls: Class[T]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse(file: Path, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read(input: str, object_class: Class[T], resource: str) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_non_strict(input: str, object_class: Class[T], resource: str) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format_yaml_error_message(original_message: str, e: JsonProcessingException) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_constraint_violation_exception(target: T, resource: str, e: JsonProcessingException) -> ConstraintViolationException:
        raise NotImplementedError  # TODO: translate from Java
