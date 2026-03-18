from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-perplexity\src\main\java\io\kestra\plugin\perplexity\ChatCompletion.java
# WARNING: Unresolved types: Exception, JsonProcessingException, ObjectNode, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class ChatCompletion(Task):
    """Send chat completion to Perplexity"""
    api_key: Property[str]
    model: Property[str]
    messages: Property[list[ChatMessage]]
    a_p_i__u_r_l: ClassVar[str] = "https://api.perplexity.ai/chat/completions"
    temperature: Property[float] = Property.ofValue(0.2)
    top_p: Property[@Max(1) Double] = Property.ofValue(0.9)
    top_k: Property[int] = Property.ofValue(0)
    stream: Property[bool] = Property.ofValue(false)
    presence_penalty: Property[@Max(2) Double] = Property.ofValue(0.0)
    frequency_penalty: Property[@Max(2) Double] = Property.ofValue(0.0)
    max_tokens: Property[int] | None = None
    json_response_schema: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_json_nodes(schema_json: str) -> ObjectNode:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        output_text: str | None = None
        raw_response: str | None = None

    @dataclass(slots=True)
    class ChatMessage:
        type: ChatMessageType | None = None
        content: str | None = None

    class ChatMessageType(str, Enum):
        SYSTEM = "SYSTEM"
        ASSISTANT = "ASSISTANT"
        USER = "USER"
