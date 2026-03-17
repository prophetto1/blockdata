from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Status:
    code: int | None = None
    is_success: bool | None = None
    user_message: str | None = None
    developer_message: str | None = None
