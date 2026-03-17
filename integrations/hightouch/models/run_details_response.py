from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hightouch.models.run_details import RunDetails


@dataclass(slots=True, kw_only=True)
class RunDetailsResponse:
    data: list[RunDetails] | None = None
    has_more: bool | None = None
