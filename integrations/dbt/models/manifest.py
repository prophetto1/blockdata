from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Manifest:
    metadata: dict[String, Object] | None = None
    nodes: dict[String, Node] | None = None

    @dataclass(slots=True)
    class Node:
        compiled_sql: str | None = None
        database: str | None = None
        schema: str | None = None
        name: str | None = None
        alias: str | None = None
        resource_type: str | None = None
        depends_on: dict[String, List[String]] | None = None
        unique_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Node:
    compiled_sql: str | None = None
    database: str | None = None
    schema: str | None = None
    name: str | None = None
    alias: str | None = None
    resource_type: str | None = None
    depends_on: dict[String, List[String]] | None = None
    unique_id: str | None = None
