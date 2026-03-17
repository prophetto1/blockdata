from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\JsonSchemaGenerator.java
# WARNING: Unresolved types: Class, FieldScope, JsonNode, ObjectMapper, ObjectNode, ResolvedType, SchemaGeneratorConfigBuilder, T, TypeContext

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.plugins.registered_plugin import RegisteredPlugin
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class JsonSchemaGenerator:
    s_u_b_t_y_p_e__r_e_s_o_l_u_t_i_o_n__e_x_c_l_u_s_i_o_n__f_o_r__p_l_u_g_i_n__s_c_h_e_m_a: list[Class[Any]] = List.of(Task.class, AbstractTrigger.class)
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson().copy()
        .configure(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS, false)
    y_a_m_l__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofYaml().copy()
        .configure(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS, false)
    default_instances: dict[Class[Any], Any] = field(default_factory=dict)
    plugin_registry: PluginRegistry | None = None

    def schemas(self, cls: Class[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def replace_one_of_with_any_of(self, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def schemas(self, cls: Class[Any], array_of: bool) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def schemas(self, cls: Class[Any], array_of: bool, allowed_plugin_types: list[str]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def schemas(self, cls: Class[Any], array_of: bool, allowed_plugin_types: list[str], with_outputs: bool) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def remove_required_on_props_with_defaults(self, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pull_documentation_and_default_from_any_of(self, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def mutate_description(self, collected_type_attributes: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def properties(self, base: Class[T], cls: Class[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, base: Class[T], cls: Class[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def build(self, builder: SchemaGeneratorConfigBuilder, draft7: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build(self, builder: SchemaGeneratorConfigBuilder, draft7: bool, allowed_plugin_types: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build(self, builder: SchemaGeneratorConfigBuilder, draft7: bool, allowed_plugin_types: list[str], with_outputs: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def type_defining_properties_to_const(self, builder: SchemaGeneratorConfigBuilder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def subtype_resolver(self, declared_type: ResolvedType, type_context: TypeContext, allowed_plugin_types: list[str]) -> list[ResolvedType]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def safely_resolve_subtype(declared_type: ResolvedType, clz: Class[Any], type_context: TypeContext) -> Optional[ResolvedType]:
        raise NotImplementedError  # TODO: translate from Java

    def get_registered_plugins(self) -> list[RegisteredPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    def default_in_all_of(self, property: JsonNode) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def generate(self, cls: Class[Any], base: Class[T]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def generate(self, cls: Class[Any], base: Class[T], allowed_plugin_types: list[str]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def defaults(self, target: FieldScope) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def extract_main_ref(self, object_node: ObjectNode) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    def add_main_ref_properties(self, main_class_def: JsonNode, object_node: ObjectNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_default_instance(self, cls: Class[Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def default_value(self, instance: Any, cls: Class[Any], field_name: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java
