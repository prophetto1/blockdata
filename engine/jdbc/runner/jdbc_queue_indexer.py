from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcQueueIndexer.java
# WARNING: Unresolved types: ApplicationContext, Class, DSLContext, T

from dataclasses import dataclass, field
from typing import Any

from engine.jdbc.runner.jdbc_queue_indexer_interface import JdbcQueueIndexerInterface
from engine.core.metrics.metric_registry import MetricRegistry


@dataclass(slots=True, kw_only=True)
class JdbcQueueIndexer:
    repositories: dict[Class[Any], JdbcQueueIndexerInterface[Any]] = field(default_factory=dict)
    metric_registry: MetricRegistry | None = None

    def accept(self, context: DSLContext, item: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def cast(message: Any) -> T:
        raise NotImplementedError  # TODO: translate from Java
