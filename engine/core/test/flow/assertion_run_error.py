from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\AssertionRunError.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AssertionRunError:
    message: str | None = None
    details: str | None = None
