from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\DefaultTracer.java
# WARNING: Unresolved types: Attributes, Callable, Context, OpenTelemetry, V, api, io, opentelemetry, trace

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.runners.run_context import RunContext
from engine.core.trace.trace_level import TraceLevel
from engine.core.trace.tracer import Tracer


@dataclass(slots=True, kw_only=True)
class DefaultTracer:
    open_telemetry: OpenTelemetry | None = None
    tracer: io.opentelemetry.api.trace.Tracer | None = None
    span_name_prefix: str | None = None
    level: TraceLevel | None = None
    base_attributes: Attributes | None = None

    def in_current_context(self, run_context: RunContext, span_name: str, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_current_context(self, run_context: RunContext, span_name: str, additional_attributes: Attributes, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_current_context(self, execution: Execution, span_name: str, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_current_context(self, execution: Execution, span_name: str, additional_attributes: Attributes, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_new_context(self, execution: Execution, span_name: str, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_new_context(self, execution: Execution, span_name: str, additional_attributes: Attributes, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_current_context(self, context: Context, span_name: str, attributes: Attributes, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_new_context(self, span_name: str, attributes: Attributes, callable: Callable[V]) -> V:
        raise NotImplementedError  # TODO: translate from Java
