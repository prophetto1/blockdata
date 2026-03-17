from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\DocumentationGenerator.java
# WARNING: Unresolved types: PebbleEngine

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.docs.abstract_class_documentation import AbstractClassDocumentation
from engine.core.docs.class_plugin_documentation import ClassPluginDocumentation
from engine.core.docs.document import Document
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.core.plugins.registered_plugin import RegisteredPlugin


@dataclass(slots=True, kw_only=True)
class DocumentationGenerator:
    pebble_engine: ClassVar[PebbleEngine]
    json_schema_generator: JsonSchemaGenerator | None = None

    def generate(self, registered_plugin: RegisteredPlugin, cls: list[type[Any]] | None = None, base_cls: type[T] | None = None, type: str | None = None) -> list[Document]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def index(plugin: RegisteredPlugin) -> list[Document]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def index_grouped_class(plugin: RegisteredPlugin) -> dict[SubGroup, dict[str, list[ClassPlugin]]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def guides(plugin: RegisteredPlugin) -> list[Document]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def doc_path(registered_plugin: RegisteredPlugin, type: str | None = None, class_plugin_documentation: ClassPluginDocumentation[T] | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def render(template_name: str, vars: dict[str, Any] | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ClassPlugin:
        name: str | None = None
        simple_name: str | None = None
        subgroup: SubGroup | None = None
        group: str | None = None
        type: str | None = None

    @dataclass(slots=True)
    class SubGroup:
        name: str | None = None
        title: str | None = None
        description: str | None = None
        icon: str | None = None
        subgroup_is_group: bool | None = None

        def compare_to(self, o: SubGroup) -> int:
            raise NotImplementedError  # TODO: translate from Java
