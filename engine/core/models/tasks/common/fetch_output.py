from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\common\FetchOutput.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.output import Output


@dataclass(slots=True, kw_only=True)
class FetchOutput:
    rows: list[Any] | None = None
    row: dict[str, Any] | None = None
    uri: str | None = None
    size: int | None = None
