from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\ChartOption.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ChartOption:
    display_name: str
    width: int = 6
    description: str | None = None

    def needed_columns(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
