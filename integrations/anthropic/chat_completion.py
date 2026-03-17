from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.anthropic.abstract_anthropic import AbstractAnthropic
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class ChatMessageType(str, Enum):
    ASSISTANT = "ASSISTANT"
    USER = "USER"


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractAnthropic, RunnableTask):
    """Send chat messages with Claude"""
    messages: Property[list[ChatMessage]]
    system: Property[str] | None = None
    tools: Property[list[Tool]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        raw_response: str | None = None
        output_text: str | None = None
        tool_uses: list[ToolUse] | None = None
        stop_reason: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    raw_response: str | None = None
    output_text: str | None = None
    tool_uses: list[ToolUse] | None = None
    stop_reason: str | None = None
