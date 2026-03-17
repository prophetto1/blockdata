from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SqlTaskSetting:
    warehouse_id: Property[str] | None = None
    query_id: Property[str] | None = None
    parameters: Any | None = None

    def to_sql_task(self, run_context: RunContext) -> SqlTask:
        raise NotImplementedError  # TODO: translate from Java
