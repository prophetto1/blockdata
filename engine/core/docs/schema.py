from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\Schema.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Schema:
    properties: dict[str, Any] | None = None
    outputs: dict[str, Any] | None = None
    definitions: dict[str, Any] | None = None
