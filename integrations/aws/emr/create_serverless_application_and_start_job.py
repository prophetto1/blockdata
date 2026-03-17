from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.emr.abstract_emr_serverless_task import AbstractEmrServerlessTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateServerlessApplicationAndStartJob(AbstractEmrServerlessTask, RunnableTask):
    """Create EMR Serverless app and start job"""
    release_label: Property[str]
    application_type: Property[str]
    execution_role_arn: Property[str]
    job_name: Property[str]
    entry_point: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        application_id: str | None = None
        job_run_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    application_id: str | None = None
    job_run_id: str | None = None
