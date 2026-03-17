from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\PluginController.java
# WARNING: Unresolved types: ClassNotFoundException, IOException, MutableHttpResponse

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.docs.class_input_documentation import ClassInputDocumentation
from engine.core.docs.class_plugin_documentation import ClassPluginDocumentation
from engine.core.docs.documentation_with_schema import DocumentationWithSchema
from engine.core.http.http_response import HttpResponse
from engine.core.docs.input_type import InputType
from engine.core.docs.json_schema_cache import JsonSchemaCache
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.core.docs.plugin import Plugin
from engine.core.docs.plugin_icon import PluginIcon
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.docs.schema_type import SchemaType
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PluginController:
    cache_directive: ClassVar[str] = "public, max-age=3600"
    json_schema_generator: JsonSchemaGenerator | None = None
    plugin_registry: PluginRegistry | None = None
    json_schema_cache: JsonSchemaCache | None = None

    def get_schemas_from_type(self, type: SchemaType, array_of: bool) -> HttpResponse[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_properties_from_type(self, type: SchemaType) -> HttpResponse[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_input_types(self) -> list[InputType]:
        raise NotImplementedError  # TODO: translate from Java

    def get_schema_from_input_type(self, type: Type) -> MutableHttpResponse[DocumentationWithSchema]:
        raise NotImplementedError  # TODO: translate from Java

    def input_documentation(self, type: Type) -> ClassInputDocumentation:
        raise NotImplementedError  # TODO: translate from Java

    def list_plugins(self) -> list[Plugin]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_icons(self) -> MutableHttpResponse[dict[str, PluginIcon]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_group_icons(self) -> MutableHttpResponse[dict[str, PluginIcon]]:
        raise NotImplementedError  # TODO: translate from Java

    def load_plugins_icon(self) -> dict[str, PluginIcon]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_documentation(self, cls: str, all_properties: bool) -> HttpResponse[DocumentationWithSchema]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_documentation_from_version(self, cls: str, version: str, all_properties: bool) -> HttpResponse[DocumentationWithSchema]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_versions(self, cls: str) -> HttpResponse[ApiPluginVersions]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_by_subgroups(self) -> list[Plugin]:
        raise NotImplementedError  # TODO: translate from Java

    def build_plugin_documentation(self, class_name: str, version: str, all_properties: bool) -> ClassPluginDocumentation[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_identifier(self, type: str, version: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def alert_replacement(self, original: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApiPluginVersions:
        type: str | None = None
        versions: list[str] | None = None
