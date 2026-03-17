from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\multipleflows\MultipleConditionWindow.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.flows.flow_id import FlowId
from engine.core.models.has_u_i_d import HasUID


@dataclass(slots=True, kw_only=True)
class MultipleConditionWindow:
    tenant_id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    condition_id: str | None = None
    start: datetime | None = None
    end: datetime | None = None
    results: dict[str, bool] | None = None
    outputs: dict[str, Any] | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(flow: FlowId, condition_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid(self, now: datetime) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def with(self, new_result: dict[str, bool]) -> MultipleConditionWindow:
        raise NotImplementedError  # TODO: translate from Java
