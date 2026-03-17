from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\DeleteServerlessApplication.java

from dataclasses import dataclass
from typing import Any

from integrations.aws.emr.abstract_emr_serverless_task import AbstractEmrServerlessTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DeleteServerlessApplication(AbstractEmrServerlessTask):
    """Delete EMR Serverless applications"""
    application_ids: Property[list[str]]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
