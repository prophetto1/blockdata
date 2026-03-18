from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\IgnoreExecutionService.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class IgnoreExecutionService:
    ignored_executions: list[str]
    ignored_flows: list[FlowId]
    ignored_namespaces: list[NamespaceId]
    ignored_tenants: list[str]
    ignored_indexer_records: list[str]
    logger: ClassVar[Logger] = getLogger(__name__)

    def ignore_execution(self, tenant: str, namespace: str | None = None, flow: str | None = None, execution_id: str | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def ignore_indexer_record(self, key: str) -> bool:
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
