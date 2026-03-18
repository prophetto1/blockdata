from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\issues\Comment.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.github.github_connector import GithubConnector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Comment(GithubConnector):
    """Comment on a GitHub issue"""
    issue_number: Property[int]
    repository: Property[str] | None = None
    body: Property[str] | None = None

    def run(self, run_context: RunContext) -> Comment.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        issue_url: str | None = None
        comment_url: str | None = None
