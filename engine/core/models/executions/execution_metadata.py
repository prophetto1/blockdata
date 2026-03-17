from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionMetadata.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class ExecutionMetadata:
    attempt_number: int = 1
    original_created_date: datetime | None = None

    def next_attempt(self) -> ExecutionMetadata:
        raise NotImplementedError  # TODO: translate from Java
