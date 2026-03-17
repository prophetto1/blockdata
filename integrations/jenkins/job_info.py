from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jenkins\src\main\java\io\kestra\plugin\jenkins\JobInfo.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.jenkins.abstract_jenkins import AbstractJenkins
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class JobInfo(AbstractJenkins):
    """Fetch Jenkins build details"""
    job_name: str
    build_number: int

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        info: dict[str, Any] | None = None

    @dataclass(slots=True)
    class GetResult:
        response: dict[str, Any] | None = None
