from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\AbstractClassDocumentation.java
# WARNING: Unresolved types: Class, T

from dataclasses import dataclass
from typing import Any

from engine.core.docs.json_schema_generator import JsonSchemaGenerator


@dataclass(slots=True, kw_only=True)
class AbstractClassDocumentation:
    defs: dict[str, Any] = new TreeMap<>()
    inputs: dict[str, Any] = new TreeMap<>()
    defs_exclusions: list[str] = List.of(
        "io.kestra.core.models.conditions.Condition",
        "io.kestra.core.models.conditions.ScheduleCondition"
    )
    deprecated: bool | None = None
    beta: bool | None = None
    cls: str | None = None
    short_name: str | None = None
    doc_description: str | None = None
    doc_body: str | None = None
    doc_examples: list[ExampleDoc] | None = None
    properties_schema: dict[str, Any] | None = None

    @staticmethod
    def flatten_without_type(map: dict[str, Any], required: list[str]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def flatten(map: dict[str, Any], required: list[str], parent_name: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def flatten_key(current: str, parent: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def properties(props: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def required(props: dict[str, Any]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExampleDoc:
        title: str | None = None
        task: str | None = None
