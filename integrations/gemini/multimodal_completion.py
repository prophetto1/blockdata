from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gemini\src\main\java\io\kestra\plugin\gemini\MultimodalCompletion.java
# WARNING: Unresolved types: Exception, Part, com, core, genai, google, io, kestra, models, tasks, types

from dataclasses import dataclass
from typing import Any, Optional

from integrations.gemini.abstract_gemini import AbstractGemini
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class MultimodalCompletion(AbstractGemini):
    """Generate multimodal responses with Gemini"""
    contents: Property[list[Content]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def guess_extension(mime: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_gemini_content(self, run_context: RunContext, content: Content) -> com.google.genai.types.Content:
        raise NotImplementedError  # TODO: translate from Java

    def create_part(self, run_context: RunContext, content: str, mime_type: str) -> Part:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        text: str | None = None
        images: list[GeneratedImage] | None = None
        safety_ratings: list[SafetyRating] | None = None
        blocked: bool | None = None
        finish_reason: str | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class GeneratedImage:
        mime_type: str | None = None
        uri: str | None = None

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Content:
        content: Property[str]
        role: Property[str] = Property.ofValue("user")
        mime_type: Property[str] | None = None

    @dataclass(slots=True)
    class SafetyRating:
        category: str | None = None
        probability: str | None = None
        blocked: bool | None = None
