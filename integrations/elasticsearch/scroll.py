from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\Scroll.java
# WARNING: Unresolved types: ElasticsearchClient, Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_search import AbstractSearch
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Scroll(AbstractSearch):
    """Scroll and store search results"""

    def run(self, run_context: RunContext) -> Scroll.Output:
        raise NotImplementedError  # TODO: translate from Java

    def clear_scroll_id(self, logger: Logger, client: ElasticsearchClient, scroll_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        uri: str | None = None
