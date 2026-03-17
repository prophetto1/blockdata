from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class PipedriveResponse:
    success: bool | None = None
    data: T | None = None
    error: str | None = None
    error_info: str | None = None
    additional_data: Any | None = None
