from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionKilledTrigger.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.tenant_interface import TenantInterface
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class ExecutionKilledTrigger(ExecutionKilled):
    type: str = "trigger"
    namespace: str | None = None
    flow_id: str | None = None
    trigger_id: str | None = None

    def is_equal(self, trigger_context: TriggerContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
