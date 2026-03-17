from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\DocumentationWithSchema.java

from dataclasses import dataclass
from typing import Any

from engine.core.docs.schema import Schema


@dataclass(slots=True, kw_only=True)
class DocumentationWithSchema:
    markdown: str | None = None
    schema: Schema | None = None
