from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\RegisteredPlugin.java
# WARNING: Unresolved types: Class, ClassLoader, Entry, IOException, Manifest

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.plugins.additional_plugin import AdditionalPlugin
from engine.core.app.app_block_interface import AppBlockInterface
from engine.core.app.app_plugin_interface import AppPluginInterface
from engine.core.models.assets.asset import Asset
from engine.core.models.assets.asset_exporter import AssetExporter
from engine.core.models.dashboards.charts.chart import Chart
from engine.core.models.conditions.condition import Condition
from engine.core.models.dashboards.data_filter import DataFilter
from engine.core.models.dashboards.data_filter_k_p_i import DataFilterKPI
from engine.core.plugins.external_plugin import ExternalPlugin
from engine.core.models.tasks.logs.log_exporter import LogExporter
from engine.core.secret.secret_plugin_interface import SecretPluginInterface
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class RegisteredPlugin:
    t_a_s_k_s__g_r_o_u_p__n_a_m_e: str = "tasks"
    t_r_i_g_g_e_r_s__g_r_o_u_p__n_a_m_e: str = "triggers"
    c_o_n_d_i_t_i_o_n_s__g_r_o_u_p__n_a_m_e: str = "conditions"
    s_t_o_r_a_g_e_s__g_r_o_u_p__n_a_m_e: str = "storages"
    s_e_c_r_e_t_s__g_r_o_u_p__n_a_m_e: str = "secrets"
    t_a_s_k__r_u_n_n_e_r_s__g_r_o_u_p__n_a_m_e: str = "task-runners"
    a_s_s_e_t_s__g_r_o_u_p__n_a_m_e: str = "assets"
    a_s_s_e_t_s__e_x_p_o_r_t_e_r_s__g_r_o_u_p__n_a_m_e: str = "asset-exporters"
    a_p_p_s__g_r_o_u_p__n_a_m_e: str = "apps"
    a_p_p__b_l_o_c_k_s__g_r_o_u_p__n_a_m_e: str = "app-blocks"
    c_h_a_r_t_s__g_r_o_u_p__n_a_m_e: str = "charts"
    d_a_t_a__f_i_l_t_e_r_s__g_r_o_u_p__n_a_m_e: str = "data-filters"
    d_a_t_a__f_i_l_t_e_r_s__k_p_i__g_r_o_u_p__n_a_m_e: str = "data-filters-kpi"
    l_o_g__e_x_p_o_r_t_e_r_s__g_r_o_u_p__n_a_m_e: str = "log-exporters"
    a_d_d_i_t_i_o_n_a_l__p_l_u_g_i_n_s__g_r_o_u_p__n_a_m_e: str = "additional-plugins"
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
    data_filters_k_p_i: list[Class[Any]] | None = None
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
