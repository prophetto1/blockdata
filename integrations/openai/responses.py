from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-openai\src\main\java\io\kestra\plugin\openai\Responses.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Responses(AbstractTask):
    """Call OpenAI Responses with tools"""
    model: Property[str]
    input: Property[Any]
    store: Property[bool] = Property.ofValue(true)
    temperature: Property[@Max(2)Double] = Property.ofValue(1.0)
    top_p: Property[@Max(1) Double] = Property.ofValue(1.0)
    text: Property[dict[str, Any]] | None = None
    tools: Property[list[dict[str, Any]]] | None = None
    tool_choice: Property[ToolChoice] | None = None
    previous_response_id: Property[str] | None = None
    reasoning: Property[dict[str, str]] | None = None
    max_output_tokens: Property[int] | None = None
    parallel_tool_calls: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class ToolChoice(str, Enum):
        NONE = "NONE"
        AUTO = "AUTO"
        REQUIRED = "REQUIRED"

    @dataclass(slots=True)
    class Output:
        response_id: str | None = None
        output_text: str | None = None
        sources: list[str] | None = None
        raw_response: dict[str, Any] | None = None
