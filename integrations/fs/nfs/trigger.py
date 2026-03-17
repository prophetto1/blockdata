from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta
from pathlib import Path

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.executions.execution import Execution
from integrations.fs.nfs.nfs_service import NfsService
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
    """Trigger on NFS file changes"""
    nfs_service: NfsService | None = None
    from: Property[str]
    reg_exp: Property[str] | None = None
    recursive: bool = False
    interval: timedelta | None = None
    on: Property[On] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None
    max_files: Property[int] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def map_to_file(self, path: Path) -> io:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PendingFile:
        path: Path | None = None
        candidate: Entry | None = None
        change_type: ChangeType | None = None

    @dataclass(slots=True)
    class TriggeredFile:
        file: io | None = None
        change_type: ChangeType | None = None

    @dataclass(slots=True)
    class Output(io):
        files: list[TriggeredFile] | None = None


@dataclass(slots=True, kw_only=True)
class PendingFile:
    path: Path | None = None
    candidate: Entry | None = None
    change_type: ChangeType | None = None


@dataclass(slots=True, kw_only=True)
class TriggeredFile:
    file: io | None = None
    change_type: ChangeType | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: list[TriggeredFile] | None = None
