from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-grafana\src\main\java\io\kestra\plugin\grafana\loki\Query.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.grafana.loki.abstract_loki_connection import AbstractLokiConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractLokiConnection):
    """Run instant LogQL query in Loki"""
    time: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        logs: list[dict[str, Any]] | None = None
        result_type: str | None = None
