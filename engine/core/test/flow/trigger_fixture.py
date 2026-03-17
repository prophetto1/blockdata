from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\TriggerFixture.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TriggerFixture:
    id: str
    type: str
    variables: dict[str, Any] | None = None
