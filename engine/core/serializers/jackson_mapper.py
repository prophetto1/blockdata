from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\JacksonMapper.java
# WARNING: Unresolved types: Class, IonSystem, JsonNode, JsonProcessingException, LoaderOptions, ObjectMapper, Pair, T, TypeReference, ZoneId

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class JacksonMapper:
    map_type_reference: ClassVar[TypeReference[dict[str, Any]]]
    list_type_reference: ClassVar[TypeReference[list[Any]]]
    object_type_reference: ClassVar[TypeReference[Any]]
    mapper: ClassVar[ObjectMapper]
    non_strict_mapper: ClassVar[ObjectMapper]
    yaml_mapper: ClassVar[ObjectMapper]
    ion_mapper: ClassVar[ObjectMapper]

    @staticmethod
    def of_json() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_json(strict: bool) -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_yaml() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(object: Any, zone_id: ZoneId) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(object: Any) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(map: Any, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(json: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_list(json: str) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_list(object: Any) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_object(json: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def cast(object: Any, cls: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log(object: T) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of_ion() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def configure(mapper: ObjectMapper) -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_ion_object_mapper() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_ion_system() -> IonSystem:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_bi_directional_diffs(before: Any, after: Any) -> Pair[JsonNode, JsonNode]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def apply_patches_on_json_node(json_object: JsonNode, patches: list[JsonNode]) -> JsonNode:
        raise NotImplementedError  # TODO: translate from Java
