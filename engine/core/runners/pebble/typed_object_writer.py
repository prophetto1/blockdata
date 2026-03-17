from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\TypedObjectWriter.java
# WARNING: Unresolved types: IOException, SpecializedWriter

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.output_writer import OutputWriter


@dataclass(slots=True, kw_only=True)
class TypedObjectWriter(OutputWriter):
    current: Any | None = None

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

    def concat_specialized(self, o: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, o: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, cbuf: list[str], off: int, len: int) -> None:
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
