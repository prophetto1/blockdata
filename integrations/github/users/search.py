from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\users\Search.java
# WARNING: Unresolved types: Exception, GHDirection, GHUserSearchBuilder

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
    """Search GitHub users"""
    order: Property[Order] = Property.ofValue(Order.ASC)
    sort: Property[Sort] = Property.ofValue(Sort.JOINED)
    query: Property[str] | None = None
    language: Property[str] | None = None
    created: Property[str] | None = None
    repositories: Property[int] | None = None
    in: Property[str] | None = None
    location: Property[str] | None = None
    followers: Property[str] | None = None
    account_type: Property[Type] | None = None

    def run(self, run_context: RunContext) -> FileOutput:
        raise NotImplementedError  # TODO: translate from Java

    class Order(str, Enum):
        ASC = "ASC"
        DESC = "DESC"

    class Sort(str, Enum):
        JOINED = "JOINED"
        REPOSITORIES = "REPOSITORIES"
        FOLLOWERS = "FOLLOWERS"

    class Type(str, Enum):
        USER = "USER"
        ORGANIZATION = "ORGANIZATION"
