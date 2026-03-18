from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\DependsOn.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class DependsOn:
    inputs: list[str] | None = None
    condition: str | None = None
