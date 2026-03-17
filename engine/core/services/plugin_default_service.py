from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\PluginDefaultService.java
# WARNING: Unresolved types: AtomicBoolean, Class, ConstraintViolationException, JsonProcessingException, Logger, ObjectMapper, TypeReference

from dataclasses import dataclass, field
from logging import logging
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
    non_default_object_mapper: ClassVar[ObjectMapper]
    object_mapper: ClassVar[ObjectMapper]
    plugin_defaults_type_ref: ClassVar[TypeReference[list[PluginDefault]]]
    warn_once: AtomicBoolean
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    plugin_defaults_field: ClassVar[str] = "pluginDefaults"
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
