from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\InfluxDBConnection.java
# WARNING: Unresolved types: InfluxDBClient

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class InfluxDBConnection:
    url: Property[@NotEmpty String]
    token: Property[@NotEmpty String]
    connect_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    read_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))

    def client(self, run_context: RunContext) -> InfluxDBClient:
        raise NotImplementedError  # TODO: translate from Java
