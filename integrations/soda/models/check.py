from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.soda.models.check_outcome import CheckOutcome


@dataclass(slots=True, kw_only=True)
class Check:
    identity: str | None = None
    name: str | None = None
    type: str | None = None
    definition: str | None = None
    data_source: str | None = None
    table: str | None = None
    column: str | None = None
    metrics: list[String] | None = None
    outcome: CheckOutcome | None = None
