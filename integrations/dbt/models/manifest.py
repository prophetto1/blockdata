from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\models\Manifest.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Manifest:
    metadata: dict[str, Any] | None = None
    nodes: dict[str, Node] | None = None

    @dataclass(slots=True)
    class Node:
        compiled_sql: str | None = None
        database: str | None = None
        schema: str | None = None
        name: str | None = None
        alias: str | None = None
        resource_type: str | None = None
        depends_on: dict[str, list[str]] | None = None
        unique_id: str | None = None
