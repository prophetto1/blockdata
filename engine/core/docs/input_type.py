from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\InputType.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class InputType:
    type: str | None = None
    cls: str | None = None
