from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta
from pathlib import Path

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.minio.downloads import Downloads
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


class ChangeType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, StatefulTriggerInterface):
    """Trigger on new local files"""
    interval: timedelta | None = None
    from: Property[str]
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None
    recursive: Property[bool] | None = None
    action: Property[Downloads] | None = None
    on: Property[On] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None
    max_files: Property[int] | None = None

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggeredFile:
        file: Path | None = None
        change_type: ChangeType | None = None

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None


@dataclass(slots=True, kw_only=True)
class TriggeredFile:
    file: Path | None = None
    change_type: ChangeType | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None
