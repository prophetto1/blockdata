from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\models\StepConfig.java
# WARNING: Unresolved types: amazon, awssdk, emr, model, services, software

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class StepConfig:
    jar: Property[str]
    name: Property[str]
    action_on_failure: Property[Action]
    main_class: Property[str] | None = None
    commands: Property[list[str]] | None = None

    def to_step(self, run_context: RunContext) -> software.amazon.awssdk.services.emr.model.StepConfig:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def command_to_aws_arguments(commands: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    class Action(str, Enum):
        TERMINATE_CLUSTER = "TERMINATE_CLUSTER"
        CANCEL_AND_WAIT = "CANCEL_AND_WAIT"
        CONTINUE = "CONTINUE"
        TERMINATE_JOB_FLOW = "TERMINATE_JOB_FLOW"
