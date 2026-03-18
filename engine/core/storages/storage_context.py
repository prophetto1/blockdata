from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\StorageContext.java

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class StorageContext:
    kestra_scheme: ClassVar[str] = "kestra"
    kestra_protocol: ClassVar[str] = KESTRA_SCHEME + "://"
    prefix_messages: ClassVar[str] = "/_messages"
    prefix_format_namespace_file: ClassVar[str] = "/%s/_files"
    prefix_format_kv: ClassVar[str] = "/%s/_kv"
    prefix_format_flows: ClassVar[str] = "/%s/%s"
    prefix_format_executions: ClassVar[str] = "/%s/%s/executions/%s"
    prefix_format_task: ClassVar[str] = "/%s/%s/executions/%s/tasks/%s/%s"
    prefix_format_trigger: ClassVar[str] = "/%s/%s/executions/%s/trigger/%s"
    prefix_format_inputs: ClassVar[str] = "/%s/%s/executions/%s/inputs/%s/%s"
    prefix_format_cache_object: ClassVar[str] = "/%s/%s/%s/cache/%s/cache.zip"
    prefix_format_cache: ClassVar[str] = "/%s/%s/%s/cache/cache.zip"
    tenant_id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    execution_id: str | None = None

    @staticmethod
    def for_task(tenant_id: str, namespace: str | None = None, flow_id: str | None = None, execution_id: str | None = None, task_id: str | None = None, task_run_id: str | None = None, task_run_value: str | None = None) -> StorageContext.Task:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_flow(flow: FlowId) -> StorageContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_execution(tenant_id: str, namespace: str | None = None, flow_id: str | None = None, execution_id: str | None = None) -> StorageContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_input(execution: Execution, input_name: str, file_name: str) -> StorageContext.Input:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_trigger(tenant_id: str, namespace: str, flow_id: str, execution_id: str, trigger_id: str) -> StorageContext.Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_execution_id(path: str) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cache_uri(self, cache_id: str, object_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace_as_path(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_state_store_prefix(self, id: str, is_namespace: bool, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_storage_uri(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_storage_uri(self, scheme: str | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_context_storage_uri(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def namespace_file_prefix(namespace: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def kv_prefix(namespace: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Task(StorageContext):
        task_id: str | None = None
        task_run_id: str | None = None
        task_run_value: str | None = None

        def get_context_storage_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Trigger(StorageContext):
        trigger_id: str | None = None

        def get_context_storage_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Input(StorageContext):
        input_name: str | None = None
        file_name: str | None = None

        def get_context_storage_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
