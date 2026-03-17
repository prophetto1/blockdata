from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\IgnoreExecutionService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class IgnoreExecutionService:
    ignored_executions: list[str] = Collections.emptyList()
    ignored_flows: list[FlowId] = Collections.emptyList()
    ignored_namespaces: list[NamespaceId] = Collections.emptyList()
    ignored_tenants: list[str] = Collections.emptyList()
    ignored_indexer_records: list[str] = Collections.emptyList()

    def ignore_execution(self, execution_id: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ignore_execution(self, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ignore_execution(self, task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ignore_indexer_record(self, key: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ignore_execution(self, tenant: str, namespace: str, flow: str, execution_id: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def split_id_parts(id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def flow_id_from(self, flow_id: str) -> FlowId:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class NamespaceId:
        tenant: str | None = None
        namespace: str | None = None

        @staticmethod
        def from(namespace_id: str) -> NamespaceId:
            raise NotImplementedError  # TODO: translate from Java
