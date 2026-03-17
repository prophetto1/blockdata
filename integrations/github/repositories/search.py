from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.slack.app.models.file_output import FileOutput
from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_search_task import GithubSearchTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Order(str, Enum):
    ASC = "ASC"
    DESC = "DESC"


class Sort(str, Enum):
    UPDATED = "UPDATED"
    STARS = "STARS"
    FORKS = "FORKS"


class Visibility(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    INTERNAL = "INTERNAL"


@dataclass(slots=True, kw_only=True)
class Search(GithubSearchTask, RunnableTask):
    """Search GitHub repositories"""
    repository: Property[str] | None = None
    query: Property[str] | None = None
    language: Property[str] | None = None
    created: Property[str] | None = None
    stars: Property[str] | None = None
    user: Property[str] | None = None
    topic: Property[str] | None = None
    order: Property[Order] | None = None
    sort: Property[Sort] | None = None
    visibility: Property[Visibility] | None = None

    def run(self, run_context: RunContext) -> FileOutput:
        raise NotImplementedError  # TODO: translate from Java
