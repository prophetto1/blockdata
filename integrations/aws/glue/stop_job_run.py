from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.aws.glue.abstract_glue_task import AbstractGlueTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StopJobRun(AbstractGlueTask, RunnableTask):
    """Stop a Glue job run"""
    job_name: Property[str]
    job_run_id: Property[str]
    wait: Property[bool] | None = None
    interval: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_job_stopped(self, run_context: RunContext, glue_client: GlueClient, get_job_run_request: GetJobRunRequest, current_job_run: AtomicReference[JobRun], interval: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def poll_and_update_job_state(self, glue_client: GlueClient, get_job_run_request: GetJobRunRequest, run_context: RunContext, current_job_run: AtomicReference[JobRun]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, job_name_value: str, job_run_id_value: str, job_run: JobRun) -> Output:
        raise NotImplementedError  # TODO: translate from Java
