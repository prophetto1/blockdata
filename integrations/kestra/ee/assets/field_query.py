from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\assets\FieldQuery.java

from dataclasses import dataclass
from typing import Any

from integrations.kestra.ee.assets.query_type import QueryType


@dataclass(slots=True, kw_only=True)
class FieldQuery:
    field: str | None = None
    type: QueryType | None = None
    value: str | None = None
