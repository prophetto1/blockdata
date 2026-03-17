from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\pulls\Search.java
# WARNING: Unresolved types: Exception, GHDirection, GHPullRequestSearchBuilder

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.slack.app.models.file_output import FileOutput
from integrations.github.g_h_pull_request_search_builder_custom import GHPullRequestSearchBuilderCustom
from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_search_task import GithubSearchTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(GithubSearchTask):
    """Search GitHub pull requests"""
    order: Property[Order] = Property.ofValue(Order.ASC)
    sort: Property[Sort] = Property.ofValue(Sort.CREATED)
    query: Property[str] | None = None
    mentions: Property[str] | None = None
    open: Property[bool] | None = None
    closed: Property[bool] | None = None
    merged: Property[bool] | None = None
    draft: Property[bool] | None = None
    assigned: Property[str] | None = None
    title: Property[str] | None = None
    closed_at: Property[str] | None = None
    created_at: Property[str] | None = None
    updated_at: Property[str] | None = None
    commit: Property[str] | None = None
    repository: Property[str] | None = None
    base: Property[str] | None = None
    head: Property[str] | None = None
    created_by_me: Property[bool] | None = None
    author: Property[str] | None = None

    def run(self, run_context: RunContext) -> FileOutput:
        raise NotImplementedError  # TODO: translate from Java

    class Order(str, Enum):
        ASC = "ASC"
        DESC = "DESC"

    class Sort(str, Enum):
        CREATED = "CREATED"
        UPDATED = "UPDATED"
        COMMENTS = "COMMENTS"
