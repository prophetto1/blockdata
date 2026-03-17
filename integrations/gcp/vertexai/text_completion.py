from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.vertexai.abstract_generative_ai import AbstractGenerativeAi
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TextCompletion(AbstractGenerativeAi, RunnableTask):
    """Generate text with Vertex AI"""
    prompt: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        predictions: list[Prediction] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    predictions: list[Prediction] | None = None
