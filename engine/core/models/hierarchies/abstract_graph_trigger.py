from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\AbstractGraphTrigger.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.triggers.trigger_interface import TriggerInterface


@dataclass(slots=True, kw_only=True)
class AbstractGraphTrigger(AbstractGraph):
    trigger_declaration: TriggerInterface | None = None
    trigger: Trigger | None = None

    def get_uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def for_execution(self) -> AbstractGraph:
        raise NotImplementedError  # TODO: translate from Java
