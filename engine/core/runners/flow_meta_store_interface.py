from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\FlowMetaStoreInterface.java

from typing import Any, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.flows.flow_with_source import FlowWithSource


class FlowMetaStoreInterface(Protocol):
    def all_last_version(self) -> list[FlowWithSource]: ...

    def find_by_id(self, tenant_id: str, namespace: str, id: str, revision: Optional[int]) -> Optional[FlowInterface]: ...

    def is_ready(self) -> bool: ...

    def find_by_id_from_task(self, tenant_id: str, namespace: str, id: str, revision: Optional[int], from_tenant: str, from_namespace: str, from_id: str) -> Optional[FlowInterface]: ...

    def find_by_execution(self, execution: Execution) -> Optional[FlowInterface]: ...
