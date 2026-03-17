from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\Output.java
# WARNING: Unresolved types: ZoneId

from typing import Any, Protocol

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


class Output(Protocol):
    def final_state(self) -> Optional[State.Type]: ...

    def to_map(self) -> dict[str, Any]: ...

    def to_map(self, zone_id: ZoneId) -> dict[str, Any]: ...
