from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\http\SseRequest.java
# WARNING: Unresolved types: Scope

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.http.abstract_http import AbstractHttp
from engine.core.http.http_sse_event import HttpSseEvent
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SseRequest(AbstractHttp):
    """Consume Server-Sent Events (SSE) from an HTTP endpoint."""
    failed_on_missing_jq: Property[bool]
    scope: ClassVar[Scope]
    concat_jq_expression: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        events: list[HttpSseEvent[Any]] | None = None
        size: int | None = None
        result: str | None = None
