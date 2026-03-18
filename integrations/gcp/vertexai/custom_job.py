from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\CustomJob.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, Exception, JobServiceSettings, JobState, Runnable, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from integrations.gcp.vertexai.models.custom_job_spec import CustomJobSpec
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CustomJob(AbstractTask):
    """Run a Vertex AI custom job"""
    region: Property[str]
    display_name: Property[str]
    spec: CustomJobSpec
    wait: Property[bool] = Property.ofValue(true)
    delete: Property[bool] = Property.ofValue(true)
    killable: AtomicReference[Runnable] = new AtomicReference<>()
    is_killed: AtomicBoolean = new AtomicBoolean(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def safely_kill_job(run_context: RunContext, settings: JobServiceSettings, job_name: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        name: str
        create_date: datetime
        update_date: datetime
        end_date: datetime
        state: JobState
