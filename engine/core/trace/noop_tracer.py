from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\NoopTracer.java
# WARNING: Unresolved types: Attributes

from dataclasses import dataclass
from typing import Any, Callable

from engine.core.models.executions.execution import Execution
from engine.core.runners.run_context import RunContext
from engine.core.trace.tracer import Tracer


@dataclass(slots=True, kw_only=True)
class NoopTracer:

    def in_current_context(self, run_context: RunContext, span_name: str, additional_attributes: Attributes, callable: Callable[V] | None = None) -> V:
        raise NotImplementedError  # TODO: translate from Java

    def in_new_context(self, execution: Execution, span_name: str, additional_attributes: Attributes, callable: Callable[V] | None = None) -> V:
        raise NotImplementedError  # TODO: translate from Java
