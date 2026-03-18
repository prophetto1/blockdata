from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\local\Trigger.java
# WARNING: Unresolved types: Action, Exception, On, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.s3.downloads import Downloads
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on new local files"""
    from: Property[str]
    interval: timedelta = Duration.ofSeconds(60)
    recursive: Property[bool] = Property.ofValue(false)
    action: Property[Downloads.Action] = Property.ofValue(Downloads.Action.NONE)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    max_files: Property[int] = Property.ofValue(25)
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, trigger_context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

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
