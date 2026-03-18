from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\ChatCompletion.java
# WARNING: Unresolved types: Exception, Prediction, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.vertexai.abstract_generative_ai import AbstractGenerativeAi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractGenerativeAi):
    """Generate chat completions with Vertex AI"""
    context: str | None = None
    examples: list[Example] | None = None
    messages: list[Message] | None = None
    history: list[Message] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Example:
        input: str
        output: str

    @dataclass(slots=True)
    class Message:
        content: Property[str]
        author: str | None = None

    @dataclass(slots=True)
    class Output:
        predictions: list[Prediction] | None = None
