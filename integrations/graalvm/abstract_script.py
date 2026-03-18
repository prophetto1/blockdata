from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\AbstractScript.java
# WARNING: Unresolved types: Builder, Context, Engine, OutputStream, Source, Value

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractScript(ABC, Task):
    script: Property[str]

    def build_context(self, run_context: RunContext, out: OutputStream, err: OutputStream) -> Context:
        raise NotImplementedError  # TODO: translate from Java

    def get_bindings(self, context: Context, language_id: str) -> Value:
        raise NotImplementedError  # TODO: translate from Java

    def context_builder(self, run_context: RunContext) -> Context.Builder:
        raise NotImplementedError  # TODO: translate from Java

    def get_engine(self) -> Engine:
        raise NotImplementedError  # TODO: translate from Java

    def generate_source(self, language_id: str, run_context: RunContext) -> Source:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EngineHolder:
        i_n_s_t_a_n_c_e: ClassVar[Engine] = Engine.create()
