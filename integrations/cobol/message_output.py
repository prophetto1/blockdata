from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cobol\src\main\java\io\kestra\plugin\cobol\MessageOutput.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MessageOutput:
    id: str | None = None
    text: str | None = None
    severity: int | None = None
