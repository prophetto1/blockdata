from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\ConcurrencyLimitService.java

from typing import Any, Protocol

from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.core.models.executions.execution import Execution
from engine.core.queues.queue_exception import QueueException
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


class ConcurrencyLimitService(Protocol):
    def unqueue(self, execution: Execution, state: State.Type) -> Execution: ...

    def find(self, tenant_id: str) -> list[ConcurrencyLimit]: ...

    def update(self, concurrency_limit: ConcurrencyLimit) -> ConcurrencyLimit: ...

    def find_by_id(self, tenant_id: str, namespace: str, flow_id: str) -> Optional[ConcurrencyLimit]: ...
