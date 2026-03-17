from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\yaml\JsonToYaml.java
# WARNING: Unresolved types: BufferedReader, Consumer, Exception, FluxSink, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class JsonToYaml(Task):
    """Convert a JSON or JSONL file into YAML."""
    from: Property[str]
    j_s_o_n__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    y_a_m_l__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml().configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, false)
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    jsonl: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def next_json(self, reader: BufferedReader, jsonl: bool) -> Consumer[FluxSink[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
