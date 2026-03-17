from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\issues\Search.java
# WARNING: Unresolved types: Exception, GHDirection, GHIssueSearchBuilder

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.slack.app.models.file_output import FileOutput
from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_search_task import GithubSearchTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(GithubSearchTask):
    """Search GitHub issues"""
    order: Property[Order] = Property.ofValue(Order.ASC)
    sort: Property[Sort] = Property.ofValue(Sort.CREATED)
    query: Property[str] | None = None
    mentions: Property[str] | None = None
    open: Property[bool] | None = None
    closed: Property[bool] | None = None
    merged: Property[bool] | None = None
    repository: Property[str] | None = None

    def run(self, run_context: RunContext) -> FileOutput:
        raise NotImplementedError  # TODO: translate from Java

    class Order(str, Enum):
        ASC = "ASC"
        DESC = "DESC"

    class Sort(str, Enum):
        CREATED = "CREATED"
        UPDATED = "UPDATED"
        COMMENTS = "COMMENTS"
