from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.jenkins.abstract_jenkins import AbstractJenkins
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class JobBuild(AbstractJenkins, RunnableTask):
    """Trigger a Jenkins job build"""
    job_name: Property[str]
    parameters: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        status: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    status: int | None = None
