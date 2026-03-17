from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gemini\src\main\java\io\kestra\plugin\gemini\TextCompletion.java
# WARNING: Unresolved types: Exception, Prediction, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gemini.abstract_gemini import AbstractGemini
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TextCompletion(AbstractGemini):
    """Generate text with a Gemini model"""
    prompt: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        predictions: list[Prediction] | None = None
