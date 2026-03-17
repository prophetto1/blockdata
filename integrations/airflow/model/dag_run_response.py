from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class DagRunResponse:
    dag_id: str | None = None
    dag_run_id: str | None = None
    end_date: OffsetDateTime | None = None
    execution_date: OffsetDateTime | None = None
    start_date: OffsetDateTime | None = None
    run_type: str | None = None
    state: str | None = None
