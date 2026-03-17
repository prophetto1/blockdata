from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\InfluxQLQuery.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.cassandra.abstract_query import AbstractQuery
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class InfluxQLQuery(AbstractQuery):
    """Run InfluxQL query against InfluxDB"""

    def run(self, run_context: RunContext) -> AbstractQuery.Output:
        raise NotImplementedError  # TODO: translate from Java
