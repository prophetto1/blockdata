from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\JsonWriter.java
# WARNING: Unresolved types: IOException, ObjectMapper, SpecializedWriter, StringWriter

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.pebble.output_writer import OutputWriter


@dataclass(slots=True, kw_only=True)
class JsonWriter(OutputWriter):
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    string_writer: StringWriter = new StringWriter()

    def write_specialized(self, i: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, l: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, d: float) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, f: float) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, s: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, b: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, c: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_specialized(self, s: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, o: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, cbuf: list[str], off: int, len: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flush(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def output(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java
