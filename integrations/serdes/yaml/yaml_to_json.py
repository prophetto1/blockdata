from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class YamlToJson(Task, RunnableTask):
    """Convert a YAML file into JSON or JSONL."""
    y_a_m_l__m_a_p_p_e_r: ObjectMapper | None = None
    j_s_o_n__m_a_p_p_e_r: ObjectMapper | None = None
    from: Property[str]
    charset: Property[str] | None = None
    jsonl: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_jsonl_record(self, writer: Writer, doc: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_json_array_state(self, state: Any, json_generator: JsonGenerator, sink: SynchronousSink[Object]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
