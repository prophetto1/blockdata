from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcTableConfig.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JdbcTableConfig:
    name: str | None = None
    cls: type[Any] | None = None
    table: str | None = None

    def name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def cls(self) -> type[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def table(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
