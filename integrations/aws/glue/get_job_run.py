from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.glue.abstract_glue_task import AbstractGlueTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetJobRun(AbstractGlueTask, RunnableTask):
    """Get Glue job run status"""
    job_name: Property[str]
    run_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
