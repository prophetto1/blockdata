from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airflow\src\main\java\io\kestra\plugin\airflow\model\DagRunResponse.java
# WARNING: Unresolved types: OffsetDateTime

from dataclasses import dataclass
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
