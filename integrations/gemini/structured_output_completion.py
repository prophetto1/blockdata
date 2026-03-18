from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gemini\src\main\java\io\kestra\plugin\gemini\StructuredOutputCompletion.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.gemini.abstract_gemini import AbstractGemini
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StructuredOutputCompletion(AbstractGemini):
    """Generate JSON with a Gemini schema"""
    prompt: Property[str]
    json_response_schema: Property[str]
    a_p_p_l_i_c_a_t_i_o_n__j_s_o_n: ClassVar[str] = "application/json"

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        predictions: list[str] | None = None
