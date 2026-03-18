from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\WebhookResponse.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_trigger import ExecutionTrigger
from engine.core.models.label import Label
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class WebhookResponse:
    tenant_id: str | None = None
    id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    flow_revision: int | None = None
    trigger: ExecutionTrigger | None = None
    outputs: dict[str, Any] | None = None
    labels: list[Label] | None = None
    state: State | None = None
    url: str | None = None

    @staticmethod
    def from_execution(execution: Execution, url: str) -> WebhookResponse:
        raise NotImplementedError  # TODO: translate from Java
