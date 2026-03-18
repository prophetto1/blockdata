from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\JsonSchemaGenerator.java
# WARNING: Unresolved types: FieldScope, ResolvedType, SchemaGeneratorConfigBuilder, TypeContext

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.plugins.registered_plugin import RegisteredPlugin
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class JsonSchemaGenerator:
    subtype_resolution_exclusion_for_plugin_schema: ClassVar[list[type[Any]]]
    mapper: ClassVar[ObjectMapper]
    yaml_mapper: ClassVar[ObjectMapper]
    logger: ClassVar[Logger] = getLogger(__name__)
    default_instances: dict[type[Any], Any] = field(default_factory=dict)
    plugin_registry: PluginRegistry | None = None

    def schemas(self, cls: type[Any], array_of: bool | None = None, allowed_plugin_types: list[str] | None = None, with_outputs: bool | None = None) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def replace_one_of_with_any_of(self, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def remove_required_on_props_with_defaults(self, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pull_documentation_and_default_from_any_of(self, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def mutate_description(self, collected_type_attributes: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def properties(self, base: type[T], cls: type[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, base: type[T], cls: type[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def build(self, builder: SchemaGeneratorConfigBuilder, draft7: bool, allowed_plugin_types: list[str] | None = None, with_outputs: bool | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def type_defining_properties_to_const(self, builder: SchemaGeneratorConfigBuilder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def subtype_resolver(self, declared_type: ResolvedType, type_context: TypeContext, allowed_plugin_types: list[str]) -> list[ResolvedType]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def safely_resolve_subtype(declared_type: ResolvedType, clz: type[Any], type_context: TypeContext) -> Optional[ResolvedType]:
        raise NotImplementedError  # TODO: translate from Java

    def get_registered_plugins(self) -> list[RegisteredPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    def default_in_all_of(self, property: JsonNode) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def generate(self, cls: type[Any], base: type[T], allowed_plugin_types: list[str] | None = None) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def defaults(self, target: FieldScope) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def extract_main_ref(self, object_node: ObjectNode) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def add_main_ref_properties(self, main_class_def: JsonNode, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_default_instance(self, cls: type[Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def default_value(self, instance: Any, cls: type[Any], field_name: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java
