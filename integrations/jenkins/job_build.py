from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jenkins\src\main\java\io\kestra\plugin\jenkins\JobBuild.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.jenkins.abstract_jenkins import AbstractJenkins
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class JobBuild(AbstractJenkins):
    """Trigger a Jenkins job build"""
    job_name: Property[str]
    parameters: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        status: int | None = None
