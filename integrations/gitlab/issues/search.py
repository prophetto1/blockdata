from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gitlab\src\main\java\io\kestra\plugin\gitlab\issues\Search.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gitlab.abstract_git_lab_task import AbstractGitLabTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(AbstractGitLabTask):
    """Search issues in a project"""
    state: Property[str] = Property.ofValue("opened")
    search: Property[str] | None = None
    labels: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        issues: list[dict[str, Any]] | None = None
        count: int | None = None
        status_code: int | None = None
