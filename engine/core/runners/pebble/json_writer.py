from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\JsonWriter.java
# WARNING: Unresolved types: SpecializedWriter, StringWriter

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.pebble.output_writer import OutputWriter


@dataclass(slots=True, kw_only=True)
class JsonWriter(OutputWriter):
    mapper: ClassVar[ObjectMapper]
    string_writer: StringWriter

    def write_specialized(self, i: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, cbuf: list[str], off: int | None = None, len: int | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flush(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def output(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java
