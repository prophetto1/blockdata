from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\FlowService.java
# WARNING: Unresolved types: Class, IllegalStateException, Method, Provider, Stream

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.flows.check.check import Check
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_source import FlowSource
from engine.core.models.topologies.flow_topology import FlowTopology
from engine.core.repositories.flow_topology_repository_interface import FlowTopologyRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.flows.generic_flow import GenericFlow
from engine.core.models.validations.model_validator import ModelValidator
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.models.validations.validate_constraint_violation import ValidateConstraintViolation


@dataclass(slots=True, kw_only=True)
class FlowService:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    flow_repository: Optional[FlowRepositoryInterface] | None = None
    plugin_default_service: PluginDefaultService | None = None
    plugin_registry: PluginRegistry | None = None
    model_validator: ModelValidator | None = None
    flow_topology_repository: Optional[FlowTopologyRepositoryInterface] | None = None
    run_context_factory: Provider[RunContextFactory] | None = None

    def create(self, flow: GenericFlow, strict_validation: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def repository(self) -> FlowRepositoryInterface:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format_validation_error(message: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_failed_checks(self, flow: Flow, inputs: dict[str, Any]) -> list[Check]:
        raise NotImplementedError  # TODO: translate from Java

    def validate(self, tenant_id: str, flow_sources: list[FlowSource]) -> list[ValidateConstraintViolation]:
        raise NotImplementedError  # TODO: translate from Java

    def import_flow(self, tenant_id: str, source: str) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def import_flow(self, tenant_id: str, source: str, dry_run: bool) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_with_source(self, tenant_id: str, namespace: str) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self, tenant_id: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace(self, tenant_id: str, namespace: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, namespace: str, flow_id: str) -> Optional[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def keep_last_version(self, stream: Stream[FlowInterface]) -> Stream[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def deprecation_paths(self, flow: Flow) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def warnings(self, flow: Flow, tenant_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def relocations(self, flow_source: str) -> list[Relocation]:
        raise NotImplementedError  # TODO: translate from Java

    def check_valid_subflows(self, flow: Flow, tenant_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def relocations(self, aliases: dict[str, Class[Any]], string_object_map: dict[str, Any]) -> list[Relocation]:
        raise NotImplementedError  # TODO: translate from Java

    def deprecation_traversal(self, prefix: str, object: Any) -> Stream[str]:
        raise NotImplementedError  # TODO: translate from Java

    def all_getters(self, clazz: Class[Any]) -> Stream[Method]:
        raise NotImplementedError  # TODO: translate from Java

    def keep_last_version(self, flows: list[FlowInterface]) -> list[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def keep_last_version_collector(self, stream: Stream[FlowInterface]) -> Stream[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def remove_unwanted(self, f: Flow, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_removed_trigger(flow: Flow, previous: Flow) -> list[AbstractTrigger]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_updated_trigger(flow: Flow, previous: Flow) -> list[AbstractTrigger]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def cleanup_source(source: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def inject_disabled(source: str, disabled: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_prefix(self, tenant_id: str, namespace_prefix: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, flow: FlowWithSource) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_if_executable_or_throw(self, tenant: str, namespace: str, id: str, revision: Optional[int]) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def find_dependencies(self, tenant: str, namespace: str, id: str, destination_only: bool, expand_all: bool) -> Stream[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def recursive_flow_topology(self, visited_topologies: list[str], tenant_id: str, namespace: str, id: str, destination_only: bool) -> Stream[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def no_repository_exception(self) -> IllegalStateException:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Relocation:
        from: str | None = None
        to: str | None = None
