from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\TypedObjectWriter.java
# WARNING: Unresolved types: SpecializedWriter

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.output_writer import OutputWriter


@dataclass(slots=True, kw_only=True)
class TypedObjectWriter(OutputWriter):
    current: Any | None = None

    def write_specialized(self, i: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def concat_specialized(self, o: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, cbuf: list[str], off: int | None = None, len: int | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flush(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def output(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_concatenable_scalar(obj: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java
