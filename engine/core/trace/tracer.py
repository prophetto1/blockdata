from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\Tracer.java
# WARNING: Unresolved types: Attributes

from typing import Any, Callable, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.utils.rethrow import Rethrow
from engine.core.runners.run_context import RunContext


class Tracer(Protocol):
    def in_current_context(self, run_context: RunContext, span_name: str, additional_attributes: Attributes, callable: Callable[V] | None = None) -> V: ...

    def in_new_context(self, execution: Execution, span_name: str, additional_attributes: Attributes, callable: Callable[V] | None = None) -> V: ...

    def throw_callable(runnable: Rethrow.CallableChecked[R, E]) -> Callable[R]: ...

    def throw_exception(exception: Exception) -> R: ...
