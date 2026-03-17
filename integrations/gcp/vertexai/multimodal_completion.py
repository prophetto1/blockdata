from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.vertexai.abstract_generative_ai import AbstractGenerativeAi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class MultimodalCompletion(AbstractGenerativeAi, RunnableTask):
    """Generate multimodal completions with Vertex AI"""
    contents: list[Content] | None = None

    def run(self, run_context: RunContext) -> MultimodalCompletion:
        raise NotImplementedError  # TODO: translate from Java

    def create_part(self, run_context: RunContext, content: Content) -> Part:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        text: str | None = None
        safety_ratings: list[SafetyRating] | None = None
        blocked: bool | None = None
        finish_reason: str | None = None

        def final_state(self) -> Optional[State]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Content:
        mime_type: Property[str] | None = None
        content: Property[str]

    @dataclass(slots=True)
    class SafetyRating:
        category: str | None = None
        probability: str | None = None
        blocked: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    text: str | None = None
    safety_ratings: list[SafetyRating] | None = None
    blocked: bool | None = None
    finish_reason: str | None = None

    def final_state(self) -> Optional[State]:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Content:
    mime_type: Property[str] | None = None
    content: Property[str]


@dataclass(slots=True, kw_only=True)
class SafetyRating:
    category: str | None = None
    probability: str | None = None
    blocked: bool | None = None
