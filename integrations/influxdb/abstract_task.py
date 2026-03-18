from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\AbstractTask.java
# WARNING: Unresolved types: InfluxDBClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.influxdb.influx_d_b_connection import InfluxDBConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    connection: InfluxDBConnection
    org: Property[str]
    bucket: Property[str] | None = None

    def client(self, run_context: RunContext) -> InfluxDBClient:
        raise NotImplementedError  # TODO: translate from Java
