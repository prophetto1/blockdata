from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\json\JsonToIon.java
# WARNING: Unresolved types: BufferedReader, Consumer, Exception, FluxSink, IOException, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class JsonToIon(Task):
    """Convert a JSON file into ION."""
    from: Property[str]
    b_u_f_f_e_r__s_i_z_e: ClassVar[int] = 32 * 1024
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson().copy()
        .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
        .setSerializationInclusion(JsonInclude.Include.ALWAYS)
        .setTimeZone(TimeZone.getDefault())
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    new_line: Property[bool] = Property.ofValue(true)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def next_row(self, input_stream: BufferedReader, new_line: bool) -> Consumer[FluxSink[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
