from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\json\JsonToToon.java
# WARNING: Unresolved types: Exception, IOException, JsonNode, ObjectMapper, Writer, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class JsonToToon(Task):
    """Convert a JSON file into TOON."""
    from: Property[str]
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson().copy()
        .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
        .setSerializationInclusion(JsonInclude.Include.ALWAYS)
        .setTimeZone(TimeZone.getDefault())
    d_o_c_u_m_e_n_t__d_e_l_i_m_i_t_e_r: ClassVar[str] = ','
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

    @dataclass(slots=True)
    class ToonEncoder:
        i_n_d_e_n_t__s_i_z_e: ClassVar[int] = 2
        i_n_d_e_n_t__u_n_i_t: ClassVar[str] = " ".repeat(INDENT_SIZE)
        first_line: bool = True
        writer: Writer | None = None

        def write_root_object(self, node: JsonNode) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_root_array(self, array: JsonNode) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_root_primitive(self, node: JsonNode) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_object(self, node: JsonNode, indent: int) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_array(self, array: JsonNode, indent: int, key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_primitive_array(self, array: JsonNode, indent: int, key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def is_uniform_primitive_object_array(self, array: JsonNode) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def write_tabular_array(self, array: JsonNode, indent: int, key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_list_array(self, array: JsonNode, indent: int, key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_list_object_item(self, obj: JsonNode, indent: int) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_list_array_first_field(self, key: str, array: JsonNode, hyphen_indent: int) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_field_array(self, key: str, array: JsonNode, indent: int) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def write_list_array_item(self, array_node: JsonNode, indent: int) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def header_prefix(self, key: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def null_node(self) -> JsonNode:
            raise NotImplementedError  # TODO: translate from Java

        def format_primitive(self, node: JsonNode) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def format_number(self, node: JsonNode) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def quote_string_if_needed(self, value: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def escape(self, s: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def format_key(self, key: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def write_line(self, indent_level: int, content: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def indent(self, level: int) -> None:
            raise NotImplementedError  # TODO: translate from Java
