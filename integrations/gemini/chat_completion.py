from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gemini\src\main\java\io\kestra\plugin\gemini\ChatCompletion.java
# WARNING: Unresolved types: Exception, Prediction, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gemini.abstract_gemini import AbstractGemini
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractGemini):
    """Run chat turns with a Gemini model"""
    messages: Property[list[ChatMessage]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        predictions: list[Prediction] | None = None

    @dataclass(slots=True)
    class ChatMessage:
        type: ChatMessageType | None = None
        content: str | None = None

    class ChatMessageType(str, Enum):
        SYSTEM = "SYSTEM"
        AI = "AI"
        USER = "USER"
