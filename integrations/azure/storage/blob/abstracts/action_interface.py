from __future__ import annotations

from enum import Enum
from typing import Any, Protocol

from integrations.minio.copy import Copy
from engine.core.models.property.property import Property


class Action(str, Enum):
    MOVE = "MOVE"
    DELETE = "DELETE"
    NONE = "NONE"


class ActionInterface(Protocol):
    def get_action(self) -> Property[Action]: ...
    def get_move_to(self) -> Copy: ...
