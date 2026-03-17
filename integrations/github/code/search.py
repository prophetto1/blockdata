from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\code\Search.java
# WARNING: Unresolved types: Exception, GHContent, GHContentSearchBuilder, GHDirection, GHFork, IOException, core, io, kestra, models, tasks

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
    """Search GitHub code"""
    order: Property[Order] = Property.ofValue(Order.ASC)
    sort: Property[Sort] = Property.ofValue(Sort.BEST_MATCH)
    query: Property[str] | None = None
    repository: Property[str] | None = None
    user: Property[str] | None = None
    in: Property[str] | None = None
    language: Property[str] | None = None
    extension: Property[str] | None = None
    fork: Property[Fork] | None = None
    filename: Property[str] | None = None
    path: Property[str] | None = None
    size: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_code_details(code: GHContent) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    class Order(str, Enum):
        ASC = "ASC"
        DESC = "DESC"

    class Sort(str, Enum):
        BEST_MATCH = "BEST_MATCH"
        INDEXED = "INDEXED"

    class Fork(str, Enum):
        PARENT_AND_FORKS = "PARENT_AND_FORKS"
        FORKS_ONLY = "FORKS_ONLY"
        PARENT_ONLY = "PARENT_ONLY"

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
