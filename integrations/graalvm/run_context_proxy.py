from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.runners.acl_checker import AclChecker
from engine.core.runners.asset_emitter import AssetEmitter
from engine.core.runners.input_and_output import InputAndOutput
from engine.core.storages.kv.k_v_store import KVStore
from engine.core.runners.local_path import LocalPath
from engine.core.models.plugin import Plugin
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_property import RunContextProperty
from engine.core.runners.s_d_k import SDK
from engine.core.storages.storage import Storage
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.working_dir import WorkingDir


@dataclass(slots=True, kw_only=True)
class RunContextProxy(RunContext):
    delegate: RunContext | None = None

    def get_trigger_execution_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_variables(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_secret_inputs(self) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_trace_parent(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_typed(self, inline: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: str, variables: dict[String, Object]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: Property[T]) -> RunContextProperty[T]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: list[String]) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: list[String], variables: dict[String, Object]) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: set[String]) -> set[String]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: set[String], variables: dict[String, Object]) -> set[String]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: dict[String, Object]) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: dict[String, Object], variables: dict[String, Object]) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def render_map(self, inline: dict[String, String]) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def render_map(self, inline: dict[String, String], variables: dict[String, Object]) -> dict[String, String]:
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

    def plugin_configurations(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def version(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def namespace_kv(self, namespace: str) -> KVStore:
        raise NotImplementedError  # TODO: translate from Java

    def local_path(self) -> LocalPath:
        raise NotImplementedError  # TODO: translate from Java

    def is_initialized(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def acl(self) -> AclChecker:
        raise NotImplementedError  # TODO: translate from Java

    def assets(self) -> AssetEmitter:
        raise NotImplementedError  # TODO: translate from Java

    def clone_for_plugin(self, plugin: Plugin) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def input_and_output(self) -> InputAndOutput:
        raise NotImplementedError  # TODO: translate from Java

    def sdk(self) -> SDK:
        raise NotImplementedError  # TODO: translate from Java
