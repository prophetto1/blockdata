from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gitlab.abstract_git_lab_task import AbstractGitLabTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(AbstractGitLabTask, RunnableTask):
    """Search issues in a project"""
    search: Property[str] | None = None
    state: Property[str] | None = None
    labels: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        issues: list[Map[String, Object]] | None = None
        count: int | None = None
        status_code: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    issues: list[Map[String, Object]] | None = None
    count: int | None = None
    status_code: int | None = None
