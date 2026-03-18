from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-deepseek\src\main\java\io\kestra\plugin\deepseek\ChatCompletion.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class ChatCompletion(Task):
    """Send chat to DeepSeek"""
    api_key: Property[str]
    model_name: Property[str]
    messages: Property[list[ChatMessage]]
    base_url: Property[str] = Property.ofValue("https://api.deepseek.com/v1")
    json_response_schema: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        response: str | None = None
        raw: str | None = None

    @dataclass(slots=True)
    class ChatMessage:
        type: ChatMessageType | None = None
        content: str | None = None

    class ChatMessageType(str, Enum):
        SYSTEM = "SYSTEM"
        ASSISTANT = "ASSISTANT"
        USER = "USER"
