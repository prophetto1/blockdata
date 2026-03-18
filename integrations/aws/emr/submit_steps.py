from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\SubmitSteps.java

from dataclasses import dataclass
from typing import Any

from integrations.aws.emr.abstract_emr_task import AbstractEmrTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.aws.emr.models.step_config import StepConfig
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SubmitSteps(AbstractEmrTask):
    """Submit EMR steps to a running cluster"""
    cluster_id: Property[str]
    steps: list[StepConfig]
    execution_role_arn: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
