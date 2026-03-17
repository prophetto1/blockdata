from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\glue\StartJobRun.java
# WARNING: Unresolved types: AtomicReference, Builder, GetJobRunRequest, GlueClient, JobRun, StartJobRunRequest

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.glue.abstract_glue_task import AbstractGlueTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StartJobRun(AbstractGlueTask):
    """Start a Glue job run"""
    job_name: Property[str]
    wait: Property[bool] = Property.ofValue(true)
    interval: Property[timedelta] = Property.ofValue(Duration.ofMillis(1000))
    arguments: Property[dict[str, str]] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def start_job(self, run_context: RunContext, glue_client: GlueClient, job_name_value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def add_arguments_if_provided(self, run_context: RunContext, request_builder: StartJobRunRequest.Builder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_job_completion(self, run_context: RunContext, glue_client: GlueClient, get_job_run_request: GetJobRunRequest, current_job_run: AtomicReference[JobRun]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def poll_and_update_job_state(self, glue_client: GlueClient, get_job_run_request: GetJobRunRequest, run_context: RunContext, current_job_run: AtomicReference[JobRun]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, job_name_value: str, job_run_id: str, job_run: JobRun) -> Output:
        raise NotImplementedError  # TODO: translate from Java
