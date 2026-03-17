from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class Output(io):
    job_name: str | None = None
    job_run_id: str | None = None
    state: str | None = None
    started_on: datetime | None = None
    completed_on: datetime | None = None
    last_modified_on: datetime | None = None
    execution_time: int | None = None
    timeout: int | None = None
    attempt: int | None = None
    error_message: str | None = None
