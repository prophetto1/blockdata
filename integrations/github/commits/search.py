from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_connector import GithubConnector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Order(str, Enum):
    ASC = "ASC"
    DESC = "DESC"


class Sort(str, Enum):
    COMMITTER_DATE = "COMMITTER_DATE"
    AUTHOR_DATE = "AUTHOR_DATE"


@dataclass(slots=True, kw_only=True)
class Search(GithubConnector, RunnableTask):
    """Search GitHub commits"""
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
    order: Property[Order] | None = None
    sort: Property[Sort] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_commit_details(self, commit: GHCommit, is_anonymous: bool) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
