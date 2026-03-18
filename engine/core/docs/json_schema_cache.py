from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\JsonSchemaCache.java
# WARNING: Unresolved types: ConcurrentHashMap, ConcurrentMap

from dataclasses import dataclass, field
from typing import Any

from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.core.docs.schema_type import SchemaType


@dataclass(slots=True, kw_only=True)
class JsonSchemaCache:
    schema_cache: ConcurrentMap[CacheKey, dict[str, Any]]
    properties_cache: ConcurrentMap[SchemaType, dict[str, Any]]
    classes_by_schema_type: dict[SchemaType, type[Any]] = field(default_factory=dict)
    json_schema_generator: JsonSchemaGenerator | None = None

    def get_schema_for_type(self, type: SchemaType, array_of: bool) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_properties_for_type(self, type: SchemaType) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def register_class_for_type(self, type: SchemaType, clazz: type[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def clear(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CacheKey:
        type: SchemaType | None = None
        array_of: bool | None = None
