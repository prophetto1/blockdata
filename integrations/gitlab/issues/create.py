from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gitlab\src\main\java\io\kestra\plugin\gitlab\issues\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gitlab.abstract_git_lab_task import AbstractGitLabTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractGitLabTask):
    """Create issue in a project"""
    title: Property[str]
    issue_description: Property[str] | None = None
    labels: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        issue_id: str | None = None
        web_url: str | None = None
        status_code: int | None = None
