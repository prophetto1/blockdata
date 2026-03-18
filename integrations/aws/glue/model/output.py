from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\glue\model\Output.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Output:
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
