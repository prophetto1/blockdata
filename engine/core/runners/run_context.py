from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContext.java
# WARNING: Unresolved types: GeneralSecurityException, Logger, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.runners.acl_checker import AclChecker
from engine.core.runners.asset_emitter import AssetEmitter
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.input_and_output import InputAndOutput
from engine.core.storages.kv.k_v_store import KVStore
from engine.core.runners.local_path import LocalPath
from engine.core.models.plugin import Plugin
from engine.core.models.property.property import Property
from engine.core.models.property.property_context import PropertyContext
from engine.core.runners.run_context_property import RunContextProperty
from engine.core.runners.run_context_serializer import RunContextSerializer
from engine.core.runners.s_d_k import SDK
from engine.core.storages.state_store import StateStore
from engine.core.storages.storage import Storage
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.working_dir import WorkingDir


@dataclass(slots=True, kw_only=True)
class RunContext(ABC):

    @abstractmethod
    def get_trigger_execution_id(self) -> str:
        ...

    @abstractmethod
    def get_variables(self) -> dict[str, Any]:
        ...

    @abstractmethod
    def get_secret_inputs(self) -> list[str]:
        ...

    @abstractmethod
    def get_trace_parent(self) -> str:
        ...

    @abstractmethod
    def render(self, inline: str) -> str:
        ...

    @abstractmethod
    def render_typed(self, inline: str) -> Any:
        ...

    @abstractmethod
    def render(self, inline: str, variables: dict[str, Any]) -> str:
        ...

    @abstractmethod
    def render(self, inline: Property[T]) -> RunContextProperty[T]:
        ...

    @abstractmethod
    def render(self, inline: list[str]) -> list[str]:
        ...

    @abstractmethod
    def render(self, inline: list[str], variables: dict[str, Any]) -> list[str]:
        ...

    @abstractmethod
    def render(self, inline: set[str]) -> set[str]:
        ...

    @abstractmethod
    def render(self, inline: set[str], variables: dict[str, Any]) -> set[str]:
        ...

    @abstractmethod
    def render(self, inline: dict[str, Any]) -> dict[str, Any]:
        ...

    @abstractmethod
    def render(self, inline: dict[str, Any], variables: dict[str, Any]) -> dict[str, Any]:
        ...

    @abstractmethod
    def render_map(self, inline: dict[str, str]) -> dict[str, str]:
        ...

    @abstractmethod
    def render_map(self, inline: dict[str, str], variables: dict[str, Any]) -> dict[str, str]:
        ...

    @abstractmethod
    def validate(self, bean: T) -> None:
        ...

    @abstractmethod
    def decrypt(self, encrypted: str) -> str:
        ...

    @abstractmethod
    def encrypt(self, plaintext: str) -> str:
        ...

    @abstractmethod
    def logger(self) -> Logger:
        ...

    @abstractmethod
    def log_file_u_r_i(self) -> str:
        ...

    @abstractmethod
    def get_storage_output_prefix(self) -> str:
        ...

    @abstractmethod
    def storage(self) -> Storage:
        ...

    @abstractmethod
    def metrics(self) -> list[AbstractMetricEntry[Any]]:
        ...

    @abstractmethod
    def metric(self, metric_entry: AbstractMetricEntry[T]) -> RunContext:
        ...

    @abstractmethod
    def dynamic_worker_result(self, worker_task_results: list[WorkerTaskResult]) -> None:
        ...

    @abstractmethod
    def dynamic_worker_results(self) -> list[WorkerTaskResult]:
        ...

    @abstractmethod
    def working_dir(self) -> WorkingDir:
        ...

    @abstractmethod
    def cleanup(self) -> None:
        ...

    @abstractmethod
    def tenant_id(self) -> str:
        ...

    @abstractmethod
    def task_run_info(self) -> TaskRunInfo:
        ...

    @abstractmethod
    def flow_info(self) -> FlowInfo:
        ...

    @abstractmethod
    def plugin_configuration(self, name: str) -> Optional[T]:
        ...

    @abstractmethod
    def plugin_configurations(self) -> dict[str, Any]:
        ...

    @abstractmethod
    def version(self) -> str:
        ...

    @abstractmethod
    def namespace_kv(self, namespace: str) -> KVStore:
        ...

    def state_store(self) -> StateStore:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def local_path(self) -> LocalPath:
        ...

    @abstractmethod
    def is_initialized(self) -> bool:
        ...

    @abstractmethod
    def acl(self) -> AclChecker:
        ...

    @abstractmethod
    def assets(self) -> AssetEmitter:
        ...

    @abstractmethod
    def clone_for_plugin(self, plugin: Plugin) -> RunContext:
        ...

    @abstractmethod
    def input_and_output(self) -> InputAndOutput:
        ...

    @abstractmethod
    def sdk(self) -> SDK:
        ...

    @dataclass(slots=True)
    class TaskRunInfo:
        execution_id: str | None = None
        task_id: str | None = None
        task_run_id: str | None = None
        value: Any | None = None

    @dataclass(slots=True)
    class FlowInfo:
        tenant_id: str | None = None
        namespace: str | None = None
        id: str | None = None
        revision: int | None = None

        @staticmethod
        def from(flow_info_map: dict[str, Any]) -> FlowInfo:
            raise NotImplementedError  # TODO: translate from Java
