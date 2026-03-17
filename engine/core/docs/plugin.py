from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\Plugin.java
# WARNING: Unresolved types: Class, PluginCategory, Predicate

from dataclasses import dataclass
from typing import Any

from engine.core.models.annotations.plugin_sub_group import PluginSubGroup
from engine.core.plugins.registered_plugin import RegisteredPlugin


@dataclass(slots=True, kw_only=True)
class Plugin:
    name: str | None = None
    title: str | None = None
    description: str | None = None
    license: str | None = None
    long_description: str | None = None
    group: str | None = None
    version: str | None = None
    manifest: dict[str, str] | None = None
    guides: list[str] | None = None
    aliases: list[str] | None = None
    tasks: list[PluginElementMetadata] | None = None
    triggers: list[PluginElementMetadata] | None = None
    conditions: list[PluginElementMetadata] | None = None
    controllers: list[PluginElementMetadata] | None = None
    storages: list[PluginElementMetadata] | None = None
    secrets: list[PluginElementMetadata] | None = None
    task_runners: list[PluginElementMetadata] | None = None
    apps: list[PluginElementMetadata] | None = None
    app_blocks: list[PluginElementMetadata] | None = None
    charts: list[PluginElementMetadata] | None = None
    data_filters: list[PluginElementMetadata] | None = None
    data_filters_kpi: list[PluginElementMetadata] | None = None
    log_exporters: list[PluginElementMetadata] | None = None
    additional_plugins: list[PluginElementMetadata] | None = None
    categories: list[PluginSubGroup.PluginCategory] | None = None
    sub_group: str | None = None

    @staticmethod
    def of(registered_plugin: RegisteredPlugin, subgroup: str) -> Plugin:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def filter_and_get_type_with_metadata(list: list[Any], clazz_filter: Predicate[Class[Any]]) -> list[PluginElementMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginElementMetadata:
        cls: str | None = None
        deprecated: bool | None = None
        title: str | None = None
        description: str | None = None
