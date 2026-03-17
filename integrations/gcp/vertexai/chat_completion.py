from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.vertexai.abstract_generative_ai import AbstractGenerativeAi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ChatCompletion(AbstractGenerativeAi, RunnableTask):
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
        author: str | None = None
        content: Property[str]

    @dataclass(slots=True)
    class Output(io):
        predictions: list[Prediction] | None = None


@dataclass(slots=True, kw_only=True)
class Example:
    input: str
    output: str


@dataclass(slots=True, kw_only=True)
class Message:
    author: str | None = None
    content: Property[str]


@dataclass(slots=True, kw_only=True)
class Output(io):
    predictions: list[Prediction] | None = None
