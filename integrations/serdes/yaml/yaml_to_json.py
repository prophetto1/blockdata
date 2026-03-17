from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\yaml\YamlToJson.java
# WARNING: Unresolved types: Exception, IOException, JsonGenerator, ObjectMapper, SynchronousSink, Writer, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class YamlToJson(Task):
    """Convert a YAML file into JSON or JSONL."""
    from: Property[str]
    y_a_m_l__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()
    j_s_o_n__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    jsonl: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_jsonl_record(self, writer: Writer, doc: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_json_array_state(self, state: list[Any], json_generator: JsonGenerator, sink: SynchronousSink[Any]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
