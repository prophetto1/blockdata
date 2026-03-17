from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcTableConfigs.java
# WARNING: Unresolved types: Class

from dataclasses import dataclass
from typing import Any

from engine.jdbc.jdbc_table_config import JdbcTableConfig


@dataclass(slots=True, kw_only=True)
class JdbcTableConfigs:
    table_configs: list[JdbcTableConfig] | None = None

    def table_config(self, name: str) -> JdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def table_config(self, cls: Class[Any]) -> JdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java
