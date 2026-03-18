from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JooqExecuteListenerFactory.java
# WARNING: Unresolved types: DataSource, ExecuteListenerProvider, jooq, org

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.metrics.metric_registry import MetricRegistry


@dataclass(slots=True, kw_only=True)
class JooqExecuteListenerFactory:
    logger: ClassVar[Logger] = getLogger(__name__)

    def jooq_configuration(self, metric_registry: MetricRegistry) -> org.jooq.ExecuteListenerProvider:
        raise NotImplementedError  # TODO: translate from Java
