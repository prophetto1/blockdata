from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_search import AbstractSearch
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Scroll(AbstractSearch, RunnableTask):
    """Scroll and store OpenSearch results"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def clear_scroll_id(self, logger: Logger, client: OpenSearchClient, scroll_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        size: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    size: int | None = None
    uri: str | None = None
