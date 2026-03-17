from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class Action(str, Enum):
    TERMINATE_CLUSTER = "TERMINATE_CLUSTER"
    CANCEL_AND_WAIT = "CANCEL_AND_WAIT"
    CONTINUE = "CONTINUE"
    TERMINATE_JOB_FLOW = "TERMINATE_JOB_FLOW"


@dataclass(slots=True, kw_only=True)
class StepConfig:
    jar: Property[str]
    main_class: Property[str] | None = None
    commands: Property[list[String]] | None = None
    name: Property[str]
    action_on_failure: Property[Action]

    def to_step(self, run_context: RunContext) -> software:
        raise NotImplementedError  # TODO: translate from Java

    def command_to_aws_arguments(self, commands: list[String]) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java
