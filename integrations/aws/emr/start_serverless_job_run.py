from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\StartServerlessJobRun.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.emr.abstract_emr_serverless_task import AbstractEmrServerlessTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StartServerlessJobRun(AbstractEmrServerlessTask):
    """Start a job on an EMR Serverless app"""
    application_id: Property[str]
    execution_role_arn: Property[str]
    job_name: Property[str]
    entry_point: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        job_run_id: str | None = None
