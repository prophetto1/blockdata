from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractScript(Task):
    script: Property[str]

    def build_context(self, run_context: RunContext, out: OutputStream, err: OutputStream) -> Context:
        raise NotImplementedError  # TODO: translate from Java

    def get_bindings(self, context: Context, language_id: str) -> Value:
        raise NotImplementedError  # TODO: translate from Java

    def context_builder(self, run_context: RunContext) -> Context:
        raise NotImplementedError  # TODO: translate from Java

    def get_engine(self) -> Engine:
        raise NotImplementedError  # TODO: translate from Java

    def generate_source(self, language_id: str, run_context: RunContext) -> Source:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EngineHolder:
        i_n_s_t_a_n_c_e: Engine | None = None


@dataclass(slots=True, kw_only=True)
class EngineHolder:
    i_n_s_t_a_n_c_e: Engine | None = None
