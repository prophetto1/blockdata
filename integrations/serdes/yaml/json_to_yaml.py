from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class JsonToYaml(Task, RunnableTask):
    """Convert a JSON or JSONL file into YAML."""
    j_s_o_n__m_a_p_p_e_r: ObjectMapper | None = None
    y_a_m_l__m_a_p_p_e_r: ObjectMapper | None = None
    from: Property[str]
    charset: Property[str] | None = None
    jsonl: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def next_json(self, reader: BufferedReader, jsonl: bool) -> Consumer[FluxSink[Object]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
