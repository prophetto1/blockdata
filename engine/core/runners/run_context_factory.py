from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextFactory.java
# WARNING: Unresolved types: ApplicationContext, Builder, Function

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.assets.asset_manager_factory import AssetManagerFactory
from engine.core.runners.default_run_context import DefaultRunContext
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.services.k_v_store_service import KVStoreService
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.services.namespace_service import NamespaceService
from engine.core.plugins.plugin_configurations import PluginConfigurations
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_cache import RunContextCache
from engine.core.runners.run_context_initializer import RunContextInitializer
from engine.core.runners.run_context_logger_factory import RunContextLoggerFactory
from engine.core.runners.run_variables import RunVariables
from engine.core.runners.secure_variable_renderer_factory import SecureVariableRendererFactory
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.runners.variable_renderer import VariableRenderer
from engine.core.runners.working_dir_factory import WorkingDirFactory


@dataclass(slots=True, kw_only=True)
class RunContextFactory:
    application_context: ApplicationContext | None = None
    plugin_configurations: PluginConfigurations | None = None
    variable_renderer: VariableRenderer | None = None
    secure_variable_renderer_factory: SecureVariableRendererFactory | None = None
    storage_interface: StorageInterface | None = None
    namespace_service: NamespaceService | None = None
    metric_registry: MetricRegistry | None = None
    run_context_cache: RunContextCache | None = None
    working_dir_factory: WorkingDirFactory | None = None
    secret_key: Optional[str] | None = None
    kestra_environment: str | None = None
    kestra_url: str | None = None
    run_context_logger_factory: RunContextLoggerFactory | None = None
    kv_store_service: KVStoreService | None = None
    namespace_factory: NamespaceFactory | None = None
    asset_manager_factory: AssetManagerFactory | None = None

    def initializer(self) -> RunContextInitializer:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, execution: Execution) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, execution: Execution, decrypt_variable: bool) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, execution: Execution, run_variable_modifier: Function[RunVariables.Builder, RunVariables.Builder]) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, execution: Execution, run_variable_modifier: Function[RunVariables.Builder, RunVariables.Builder], decrypt_variables: bool) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, task: Task, execution: Execution, task_run: TaskRun) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, task: Task, execution: Execution, task_run: TaskRun, decrypt_variables: bool) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, task: Task, execution: Execution, task_run: TaskRun, decrypt_variables: bool, variable_renderer: VariableRenderer) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, trigger: AbstractTrigger) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, flow: FlowInterface, variables: dict[str, Any]) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, variables: dict[str, Any]) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, task: Task, variables: dict[str, Any]) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def of(self) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def secret_inputs_from_flow(self, flow: FlowInterface) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def new_builder(self) -> DefaultRunContext.Builder:
        raise NotImplementedError  # TODO: translate from Java

    def new_run_variables_builder(self) -> RunVariables.Builder:
        raise NotImplementedError  # TODO: translate from Java
