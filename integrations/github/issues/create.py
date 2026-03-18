from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\issues\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.github.github_connector import GithubConnector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(GithubConnector):
    """Create a GitHub issue"""
    repository: Property[str] | None = None
    title: Property[str] | None = None
    body: Property[str] | None = None
    labels: Property[list[str]] | None = None
    assignees: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Create.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        issue_url: str | None = None
        issue_number: int | None = None
