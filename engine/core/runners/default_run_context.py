from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\DefaultRunContext.java
# WARNING: Unresolved types: ApplicationContext, AtomicBoolean, FlowInfo, GeneralSecurityException, Logger, T, TaskRunInfo, Validator

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.runners.acl_checker import AclChecker
from engine.core.runners.asset_emitter import AssetEmitter
from engine.core.assets.asset_manager_factory import AssetManagerFactory
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.input_and_output import InputAndOutput
from engine.core.storages.kv.k_v_store import KVStore
from engine.core.services.k_v_store_service import KVStoreService
from engine.core.runners.local_path import LocalPath
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.models.plugin import Plugin
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_logger import RunContextLogger
from engine.core.runners.run_context_property import RunContextProperty
from engine.core.runners.s_d_k import SDK
from engine.core.storages.storage import Storage
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task
from engine.core.runners.variable_renderer import VariableRenderer
from engine.core.utils.version_provider import VersionProvider
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.working_dir import WorkingDir


@dataclass(slots=True, kw_only=True)
class DefaultRunContext(RunContext):
    metrics: list[AbstractMetricEntry[Any]] = field(default_factory=list)
    dynamic_worker_task_result: list[WorkerTaskResult] = field(default_factory=list)
    is_initialized: AtomicBoolean = new AtomicBoolean(false)
    application_context: ApplicationContext | None = None
    variable_renderer: VariableRenderer | None = None
    meter_registry: MetricRegistry | None = None
    version: VersionProvider | None = None
    kv_store_service: KVStoreService | None = None
    asset_manager_factory: AssetManagerFactory | None = None
    secret_key: Optional[str] | None = None
    working_dir: WorkingDir | None = None
    validator: Validator | None = None
    local_path: LocalPath | None = None
    sdk: SDK | None = None
    variables: dict[str, Any] | None = None
    logger: RunContextLogger | None = None
    trigger_execution_id: str | None = None
    storage: Storage | None = None
    plugin_configuration: dict[str, Any] | None = None
    secret_inputs: list[str] | None = None
    trace_parent: str | None = None
    task: Task | None = None
    trigger: AbstractTrigger | None = None
    asset_emitter: AssetEmitter | None = None

    def get_trigger_execution_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_variables(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_secret_inputs(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_trace_parent(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_application_context(self) -> ApplicationContext:
        raise NotImplementedError  # TODO: translate from Java

    def get_task(self) -> Task:
        raise NotImplementedError  # TODO: translate from Java

    def get_trigger(self) -> AbstractTrigger:
        raise NotImplementedError  # TODO: translate from Java

    def init(self, application_context: ApplicationContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_secret(self, secret_input: str, inputs: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def clone(self) -> DefaultRunContext:
        raise NotImplementedError  # TODO: translate from Java

    def clone_for_plugin(self, plugin: Plugin) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_typed(self, inline: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: Property[T]) -> RunContextProperty[T]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: str, variables: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: list[str], variables: dict[str, Any]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: set[str]) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: set[str], variables: dict[str, Any]) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: dict[str, Any], variables: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_map(self, inline: dict[str, str]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def render_map(self, inline: dict[str, str], variables: dict[str, Any]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def validate(self, bean: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def decrypt(self, encrypted: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def encrypt(self, plaintext: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def logger(self) -> Logger:
        raise NotImplementedError  # TODO: translate from Java

    def log_file_u_r_i(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_storage_output_prefix(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def storage(self) -> Storage:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self) -> list[AbstractMetricEntry[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def metric(self, metric_entry: AbstractMetricEntry[T]) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def decrypt_variables(self, variables: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def metrics_tags(self) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def metric_prefix(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def dynamic_worker_result(self, worker_task_results: list[WorkerTaskResult]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def dynamic_worker_results(self) -> list[WorkerTaskResult]:
        raise NotImplementedError  # TODO: translate from Java

    def working_dir(self) -> WorkingDir:
        raise NotImplementedError  # TODO: translate from Java

    def cleanup(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def tenant_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def task_run_info(self) -> TaskRunInfo:
        raise NotImplementedError  # TODO: translate from Java

    def flow_info(self) -> FlowInfo:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_configuration(self, name: str) -> Optional[T]:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_configurations(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def version(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def namespace_kv(self, namespace: str) -> KVStore:
        raise NotImplementedError  # TODO: translate from Java

    def is_initialized(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def acl(self) -> AclChecker:
        raise NotImplementedError  # TODO: translate from Java

    def assets(self) -> AssetEmitter:
        raise NotImplementedError  # TODO: translate from Java

    def local_path(self) -> LocalPath:
        raise NotImplementedError  # TODO: translate from Java

    def input_and_output(self) -> InputAndOutput:
        raise NotImplementedError  # TODO: translate from Java

    def sdk(self) -> SDK:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Builder:
        secret_key: Optional[str] = Optional.empty()
        application_context: ApplicationContext | None = None
        variable_renderer: VariableRenderer | None = None
        storage_interface: StorageInterface | None = None
        meter_registry: MetricRegistry | None = None
        variables: dict[str, Any] | None = None
        dynamic_worker_results: list[WorkerTaskResult] | None = None
        plugin_configuration: dict[str, Any] | None = None
        working_dir: WorkingDir | None = None
        storage: Storage | None = None
        trigger_execution_id: str | None = None
        logger: RunContextLogger | None = None
        kv_store_service: KVStoreService | None = None
        asset_manager_factory: AssetManagerFactory | None = None
        secret_inputs: list[str] | None = None
        task: Task | None = None
        trigger: AbstractTrigger | None = None

        def build(self) -> DefaultRunContext:
            raise NotImplementedError  # TODO: translate from Java
