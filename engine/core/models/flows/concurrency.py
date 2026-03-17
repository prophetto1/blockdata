from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Concurrency.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Concurrency:
    limit: int
    behavior: Behavior = Behavior.QUEUE

    @staticmethod
    def possible_transitions(type: State.Type) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class Behavior(str, Enum):
        QUEUE = "QUEUE"
        CANCEL = "CANCEL"
        FAIL = "FAIL"
