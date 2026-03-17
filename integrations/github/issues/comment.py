from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.github.github_connector import GithubConnector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Comment(GithubConnector, RunnableTask):
    """Comment on a GitHub issue"""
    repository: Property[str] | None = None
    issue_number: Property[int]
    body: Property[str] | None = None

    def run(self, run_context: RunContext) -> Comment:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        issue_url: URL | None = None
        comment_url: URL | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    issue_url: URL | None = None
    comment_url: URL | None = None
