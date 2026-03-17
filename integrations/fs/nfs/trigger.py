from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\nfs\Trigger.java
# WARNING: Unresolved types: Exception, IOException, On, core, fs, io, kestra, models, nfs, plugin, tasks

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.executions.execution import Execution
from integrations.fs.nfs.nfs_service import NfsService
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on NFS file changes"""
    from: Property[str]
    nfs_service: NfsService = NfsService.getInstance()
    recursive: bool = False
    interval: timedelta = Duration.ofSeconds(60)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    max_files: Property[int] = Property.ofValue(25)
    reg_exp: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def map_to_file(self, path: Path) -> io.kestra.plugin.fs.nfs.List.File:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PendingFile:
        path: Path | None = None
        candidate: Entry | None = None
        change_type: ChangeType | None = None

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"

    @dataclass(slots=True)
    class TriggeredFile:
        file: io.kestra.plugin.fs.nfs.List.File | None = None
        change_type: ChangeType | None = None

    @dataclass(slots=True)
    class Output:
        files: list[TriggeredFile] | None = None
