from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.influxdb.influx_d_b_connection import InfluxDBConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task):
    connection: InfluxDBConnection
    bucket: Property[str] | None = None
    org: Property[str]

    def client(self, run_context: RunContext) -> InfluxDBClient:
        raise NotImplementedError  # TODO: translate from Java
