from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\topics\Search.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.github.g_h_topic_search_builder import GHTopicSearchBuilder
from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_connector import GithubConnector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(GithubConnector):
    """Search GitHub topics"""
    order: Property[Order] = Property.ofValue(Order.ASC)
    query: Property[str] | None = None
    is: Property[Is] | None = None
    repositories: Property[str] | None = None
    created: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class Order(str, Enum):
        ASC = "ASC"
        DESC = "DESC"

    class Is(str, Enum):
        CURATED = "CURATED"
        FEATURED = "FEATURED"
        NOT_CURATED = "NOT_CURATED"
        NOT_FEATURED = "NOT_FEATURED"

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
