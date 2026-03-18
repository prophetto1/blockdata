from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\TriggerContext.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.triggers.backfill import Backfill
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class TriggerContext:
    namespace: str
    flow_id: str
    trigger_id: str
    date: datetime
    disabled: bool = Boolean.FALSE
    tenant_id: str | None = None
    next_execution_date: datetime | None = None
    backfill: Backfill | None = None
    stop_after: list[State.Type] | None = None

    @staticmethod
    def builder() -> TriggerContextBuilder[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(trigger: TriggerContext | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggerContextBuilder(ABC):
        pass
