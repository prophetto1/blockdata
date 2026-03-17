from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\Trigger.java
# WARNING: Unresolved types: Action, Exception, FileSystemOptions, IOException, On, URISyntaxException, core, io, java, kestra, models, tasks, util

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.fs.vfs.abstract_vfs_interface import AbstractVfsInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.s3.downloads import Downloads
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(ABC, AbstractTrigger):
    from: Property[str]
    action: Property[Downloads.Action]
    interval: timedelta = Duration.ofSeconds(60)
    recursive: Property[bool] = Property.ofValue(false)
    enable_ssh_rsa1: Property[bool] = Property.ofValue(false)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    max_files: Property[int] = Property.ofValue(25)
    host: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    @abstractmethod
    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        ...

    @abstractmethod
    def scheme(self) -> str:
        ...

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def create_uri(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PendingFile:
        file: Path | None = None
        candidate: Entry | None = None
        change_type: ChangeType | None = None

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"

    @dataclass(slots=True)
    class TriggeredFile:
        file: Path | None = None
        change_type: ChangeType | None = None

    @dataclass(slots=True)
    class Output:
        files: java.util.List[TriggeredFile] | None = None
