from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\Scroll.java
# WARNING: Unresolved types: Exception, Logger, OpenSearchClient, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_search import AbstractSearch
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Scroll(AbstractSearch):
    """Scroll and store OpenSearch results"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def clear_scroll_id(self, logger: Logger, client: OpenSearchClient, scroll_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        uri: str | None = None
