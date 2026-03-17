from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\Load.java
# WARNING: Unresolved types: BufferedReader, Exception, Flux, Point

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_load import AbstractLoad
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    """Load ION records into InfluxDB"""
    measurement: Property[str]
    tags: Property[list[str]] | None = None
    time_field: Property[str] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[Point]:
        raise NotImplementedError  # TODO: translate from Java
