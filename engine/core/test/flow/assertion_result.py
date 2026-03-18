from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\AssertionResult.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AssertionResult:
    operator: str | None = None
    expected: Any | None = None
    actual: Any | None = None
    is_success: bool | None = None
    task_id: str | None = None
    description: str | None = None
    error_message: str | None = None
