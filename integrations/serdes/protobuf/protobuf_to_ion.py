from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\protobuf\ProtobufToIon.java
# WARNING: Unresolved types: Consumer, Descriptor, Exception, FluxSink, IOException, InputStream, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class ProtobufToIon(Task):
    """Convert a Protobuf file into Amazon Ion."""
    from: Property[str]
    descriptor_file: Property[str]
    type_name: Property[str]
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson().copy()
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
            .setSerializationInclusion(JsonInclude.Include.ALWAYS).setTimeZone(TimeZone.getDefault())
    delimited: Property[bool] = Property.ofValue(false)
    error_on_unknown_fields: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def next_message(self, input_stream: InputStream, message_descriptor: Descriptor, is_delimited: bool, error_on_unknown: bool) -> Consumer[FluxSink[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
