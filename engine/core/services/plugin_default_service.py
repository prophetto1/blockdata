from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\PluginDefaultService.java
# WARNING: Unresolved types: AtomicBoolean, Class, ConstraintViolationException, JsonProcessingException, Logger, ObjectMapper, TypeReference

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.executions.log_entry import LogEntry
from engine.core.models.plugin import Plugin
from engine.core.models.flows.plugin_default import PluginDefault
from engine.core.services.plugin_global_default_configuration import PluginGlobalDefaultConfiguration
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.queues.queue_interface import QueueInterface
from engine.core.services.task_global_default_configuration import TaskGlobalDefaultConfiguration


@dataclass(slots=True, kw_only=True)
class PluginDefaultService:
    n_o_n__d_e_f_a_u_l_t__o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()
        .copy()
        .setDefaultPropertyInclusion(JsonInclude.Include.NON_DEFAULT)
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml().copy()
        .setDefaultPropertyInclusion(JsonInclude.Include.NON_NULL)
    p_l_u_g_i_n__d_e_f_a_u_l_t_s__f_i_e_l_d: ClassVar[str] = "pluginDefaults"
    p_l_u_g_i_n__d_e_f_a_u_l_t_s__t_y_p_e__r_e_f: ClassVar[TypeReference[list[PluginDefault]]] = new TypeReference<>() {
    }
    warn_once: AtomicBoolean = new AtomicBoolean(false)
    task_global_default: TaskGlobalDefaultConfiguration | None = None
    plugin_global_default: PluginGlobalDefaultConfiguration | None = None
    log_queue: QueueInterface[LogEntry] | None = None
    plugin_registry: PluginRegistry | None = None
    templates_enabled: bool | None = None

    def validate_global_plugin_default(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_defaults(self, tenant_id: str, namespace: str, flow: dict[str, Any]) -> list[PluginDefault]:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_defaults(self, flow: dict[str, Any]) -> list[PluginDefault]:
        raise NotImplementedError  # TODO: translate from Java

    def get_global_defaults(self) -> list[PluginDefault]:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, flow: FlowInterface, execution: Execution) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def inject_all_defaults(self, flow: FlowInterface, logger: Logger) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_without_defaults_or_throw(flow: FlowInterface) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def inject_all_defaults(self, flow: FlowInterface, strict_parsing: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def inject_version_defaults(self, flow: FlowInterface, safe: bool, strict_parsing: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def inject_version_defaults(self, flow: FlowInterface, safe: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def inject_version_defaults(self, tenant_id: str, namespace: str, map_flow: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_flow_with_all_defaults(self, tenant_id: str, source: str, strict: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def parse_flow_with_version_defaults(self, tenant_id: str, source: str, strict_parsing: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def parse_flow_with_all_defaults(self, tenant: str, namespace: str, revision: int, is_deleted: bool, source: str, only_versions: bool, strict_parsing: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def inner_inject_default(self, tenant_id: str, namespace: str, flow_as_map: dict[str, Any], only_versions: bool) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_default(self, plugin_default: PluginDefault) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_class_by_identifier(self, plugin_default: PluginDefault) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_defaults_to_map(self, plugin_defaults: list[PluginDefault]) -> dict[str, list[PluginDefault]]:
        raise NotImplementedError  # TODO: translate from Java

    def add_aliases(self, all_defaults: list[PluginDefault]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def recursive_defaults(self, object: Any, defaults: dict[str, list[PluginDefault]]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def defaults(self, plugin: dict[Any, Any], defaults: dict[str, list[PluginDefault]]) -> dict[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, flow: Flow, logger: Logger) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, flow: Flow) -> Flow:
        raise NotImplementedError  # TODO: translate from Java
