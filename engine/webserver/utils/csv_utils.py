from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\CSVUtils.java
# WARNING: Unresolved types: Flux, Writer

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class CSVUtils:

    @staticmethod
    def to_csv(out_writer: Writer, lines: list[dict[str, Any]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_csv_flux(records: Flux[dict[str, Any]]) -> Flux[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def escape_csv(value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
