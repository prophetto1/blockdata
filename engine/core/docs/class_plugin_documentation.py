from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\ClassPluginDocumentation.java
# WARNING: Unresolved types: Class, ConcurrentHashMap, T

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.docs.abstract_class_documentation import AbstractClassDocumentation
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.core.plugins.plugin_class_and_metadata import PluginClassAndMetadata


@dataclass(slots=True, kw_only=True)
class ClassPluginDocumentation(AbstractClassDocumentation):
    c_a_c_h_e: ClassVar[dict[PluginDocIdentifier, ClassPluginDocumentation[Any]]] = new ConcurrentHashMap<>()
    outputs: dict[str, Any] = new TreeMap<>()
    icon: str | None = None
    group: str | None = None
    doc_license: str | None = None
    plugin_title: str | None = None
    sub_group: str | None = None
    replacement: str | None = None
    doc_metrics: list[MetricDoc] | None = None
    outputs_schema: dict[str, Any] | None = None

    @staticmethod
    def of(json_schema_generator: JsonSchemaGenerator, plugin: PluginClassAndMetadata[T], version: str, all_properties: bool) -> ClassPluginDocumentation[T]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MetricDoc:
        name: str | None = None
        type: str | None = None
        unit: str | None = None
        description: str | None = None

    @dataclass(slots=True)
    class PluginDocIdentifier:
        plugin_class_and_version: str | None = None
        all_properties: bool | None = None
