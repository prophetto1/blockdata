from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\vertexai\MultimodalCompletion.java
# WARNING: Unresolved types: Exception, Part, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any, Optional

from integrations.gcp.vertexai.abstract_generative_ai import AbstractGenerativeAi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class MultimodalCompletion(AbstractGenerativeAi):
    """Generate multimodal completions with Vertex AI"""
    contents: list[Content] | None = None

    def run(self, run_context: RunContext) -> MultimodalCompletion.Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_part(self, run_context: RunContext, content: Content) -> Part:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        text: str | None = None
        safety_ratings: list[SafetyRating] | None = None
        blocked: bool | None = None
        finish_reason: str | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Content:
        content: Property[str]
        mime_type: Property[str] | None = None

    @dataclass(slots=True)
    class SafetyRating:
        category: str | None = None
        probability: str | None = None
        blocked: bool | None = None
