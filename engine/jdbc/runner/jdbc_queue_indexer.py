from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcQueueIndexer.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.jdbc.runner.jdbc_queue_indexer_interface import JdbcQueueIndexerInterface
from engine.core.metrics.metric_registry import MetricRegistry


@dataclass(slots=True, kw_only=True)
class JdbcQueueIndexer:
    logger: ClassVar[Logger] = getLogger(__name__)
    repositories: dict[type[Any], JdbcQueueIndexerInterface[Any]] = field(default_factory=dict)
    metric_registry: MetricRegistry | None = None

    def accept(self, context: DSLContext, item: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def cast(message: Any) -> T:
        raise NotImplementedError  # TODO: translate from Java
