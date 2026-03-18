from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\Result.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Result:
    uuid: str | None = None
    status: int | None = None
