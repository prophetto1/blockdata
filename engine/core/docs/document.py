from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\Document.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Document:
    path: str | None = None
    body: str | None = None
    icon: str | None = None
    schema: Schema | None = None
