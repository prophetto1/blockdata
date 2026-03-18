from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\TracerFactory.java
# WARNING: Unresolved types: OpenTelemetry, opentelemetry, trace

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.trace.trace_level import TraceLevel
from engine.core.trace.tracer import Tracer
from engine.core.trace.traces_configuration import TracesConfiguration


@dataclass(slots=True, kw_only=True)
class TracerFactory:
    open_telemetry: Optional[OpenTelemetry] | None = None
    tracer: Optional[io.opentelemetry.api.trace.Tracer] | None = None
    traces_configuration: TracesConfiguration | None = None

    def level_from_configuration(self, name: str) -> TraceLevel:
        raise NotImplementedError  # TODO: translate from Java
