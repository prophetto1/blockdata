from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\multipleflows\MultipleConditionStorageInterface.java

from typing import Any, Protocol

from engine.core.models.flows.flow_id import FlowId
from engine.core.models.triggers.multipleflows.multiple_condition import MultipleCondition
from engine.core.models.triggers.multipleflows.multiple_condition_window import MultipleConditionWindow


class MultipleConditionStorageInterface(Protocol):
    def get(self, flow: FlowId, condition_id: str) -> Optional[MultipleConditionWindow]: ...

    def expired(self, tenant_id: str) -> list[MultipleConditionWindow]: ...

    def get_or_create(self, flow: FlowId, multiple_condition: MultipleCondition, outputs: dict[str, Any]) -> MultipleConditionWindow: ...

    def save(self, multiple_condition_windows: list[MultipleConditionWindow]) -> None: ...

    def delete(self, multiple_condition_window: MultipleConditionWindow) -> None: ...
