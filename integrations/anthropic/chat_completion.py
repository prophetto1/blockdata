from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-anthropic\src\main\java\io\kestra\plugin\anthropic\ChatCompletion.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.anthropic.abstract_anthropic import AbstractAnthropic
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractAnthropic):
    """Send chat messages with Claude"""
    messages: Property[list[ChatMessage]]
    system: Property[str] | None = None
    tools: Property[list[Tool]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ChatMessage:
        type: ChatMessageType | None = None
        content: str | None = None

    class ChatMessageType(str, Enum):
        ASSISTANT = "ASSISTANT"
        USER = "USER"

    @dataclass(slots=True)
    class Tool:
        name: str | None = None
        description: str | None = None
        input_schema: dict[str, Any] | None = None

    @dataclass(slots=True)
    class ToolUse:
        id: str | None = None
        name: str | None = None
        input: dict[str, Any] | None = None

    @dataclass(slots=True)
    class Output:
        raw_response: str | None = None
        output_text: str | None = None
        tool_uses: list[ToolUse] | None = None
        stop_reason: str | None = None
