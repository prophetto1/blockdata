from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class SetupTestResultResponse:
    title: str | None = None
    status: str | None = None
    message: str | None = None
    details: Any | None = None
