from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\commits\Search.java
# WARNING: Unresolved types: Exception, GHCommit, GHCommitSearchBuilder, GHDirection, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_connector import GithubConnector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(GithubConnector):
    """Search GitHub commits"""
    order: Property[Order] = Property.ofValue(Order.ASC)
    sort: Property[Sort] = Property.ofValue(Sort.COMMITTER_DATE)
    query: Property[str] | None = None
    repository: Property[str] | None = None
    is: Property[str] | None = None
    hash: Property[str] | None = None
    parent: Property[str] | None = None
    tree: Property[str] | None = None
    user: Property[str] | None = None
    org: Property[str] | None = None
    author: Property[str] | None = None
    author_date: Property[str] | None = None
    author_email: Property[str] | None = None
    author_name: Property[str] | None = None
    committer: Property[str] | None = None
    committer_date: Property[str] | None = None
    committer_email: Property[str] | None = None
    committer_name: Property[str] | None = None
    merge: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_commit_details(commit: GHCommit, is_anonymous: bool) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    class Order(str, Enum):
        ASC = "ASC"
        DESC = "DESC"

    class Sort(str, Enum):
        COMMITTER_DATE = "COMMITTER_DATE"
        AUTHOR_DATE = "AUTHOR_DATE"

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
