from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\AbstractTriggerForExecution.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.trigger_interface import TriggerInterface


@dataclass(slots=True, kw_only=True)
class AbstractTriggerForExecution:
    id: str | None = None
    type: str | None = None
    version: str | None = None

    @staticmethod
    def of(abstract_trigger: AbstractTrigger) -> AbstractTriggerForExecution:
        raise NotImplementedError  # TODO: translate from Java
