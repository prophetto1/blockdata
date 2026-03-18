from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\models\Check.java

from dataclasses import dataclass
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
    metrics: list[str] | None = None
    outcome: CheckOutcome | None = None
