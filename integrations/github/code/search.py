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
    BEST_MATCH = "BEST_MATCH"
    INDEXED = "INDEXED"


class Fork(str, Enum):
    PARENT_AND_FORKS = "PARENT_AND_FORKS"
    FORKS_ONLY = "FORKS_ONLY"
    PARENT_ONLY = "PARENT_ONLY"


@dataclass(slots=True, kw_only=True)
class Search(GithubConnector, RunnableTask):
    """Search GitHub code"""
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
    order: Property[Order] | None = None
    sort: Property[Sort] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_code_details(self, code: GHContent) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
