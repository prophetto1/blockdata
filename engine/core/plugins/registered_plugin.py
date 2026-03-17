from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\RegisteredPlugin.java
# WARNING: Unresolved types: Class, ClassLoader, Entry, IOException, Manifest

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.plugins.additional_plugin import AdditionalPlugin
from engine.core.app.app_block_interface import AppBlockInterface
from engine.core.app.app_plugin_interface import AppPluginInterface
from engine.core.models.assets.asset import Asset
from engine.core.models.assets.asset_exporter import AssetExporter
from engine.core.models.dashboards.charts.chart import Chart
from engine.core.models.conditions.condition import Condition
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_kpi import DataFilterKPI
from engine.core.plugins.external_plugin import ExternalPlugin
from engine.core.models.tasks.logs.log_exporter import LogExporter
from engine.core.secret.secret_plugin_interface import SecretPluginInterface
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class RegisteredPlugin:
    tasks_group_name: ClassVar[str] = "tasks"
    triggers_group_name: ClassVar[str] = "triggers"
    conditions_group_name: ClassVar[str] = "conditions"
    storages_group_name: ClassVar[str] = "storages"
    secrets_group_name: ClassVar[str] = "secrets"
    task_runners_group_name: ClassVar[str] = "task-runners"
    assets_group_name: ClassVar[str] = "assets"
    assets_exporters_group_name: ClassVar[str] = "asset-exporters"
    apps_group_name: ClassVar[str] = "apps"
    app_blocks_group_name: ClassVar[str] = "app-blocks"
    charts_group_name: ClassVar[str] = "charts"
    data_filters_group_name: ClassVar[str] = "data-filters"
    data_filters_kpi_group_name: ClassVar[str] = "data-filters-kpi"
    log_exporters_group_name: ClassVar[str] = "log-exporters"
    additional_plugins_group_name: ClassVar[str] = "additional-plugins"
    external_plugin: ExternalPlugin | None = None
    manifest: Manifest | None = None
    class_loader: ClassLoader | None = None
    tasks: list[Class[Any]] | None = None
    triggers: list[Class[Any]] | None = None
    conditions: list[Class[Any]] | None = None
    storages: list[Class[Any]] | None = None
    secrets: list[Class[Any]] | None = None
    task_runners: list[Class[Any]] | None = None
    assets: list[Class[Any]] | None = None
    asset_exporters: list[Class[Any]] | None = None
    apps: list[Class[Any]] | None = None
    app_blocks: list[Class[Any]] | None = None
    charts: list[Class[Any]] | None = None
    data_filters: list[Class[Any]] | None = None
    data_filters_kpi: list[Class[Any]] | None = None
    log_exporters: list[Class[Any]] | None = None
    additional_plugins: list[Class[Any]] | None = None
    guides: list[str] | None = None
    aliases: dict[str, Map.Entry[str, Class[Any]]] | None = None

    def is_valid(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_class(self, cls: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def find_class(self, cls: str) -> Optional[Class]:
        raise NotImplementedError  # TODO: translate from Java

    def base_class(self, cls: str) -> Class:
        raise NotImplementedError  # TODO: translate from Java

    def all_class(self) -> list[Class]:
        raise NotImplementedError  # TODO: translate from Java

    def all_class_grouped(self) -> dict[str, list[Class]]:
        raise NotImplementedError  # TODO: translate from Java

    def sub_group_names(self) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def path(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def title(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def group(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def description(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def license(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def long_description(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def guides(self) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def version(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def icon(self, cls: Class[Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def icon(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def icon(self, icon_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def crc32(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
