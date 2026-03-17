from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DbtTaskSetting:
    catalog: Property[str] | None = None
    schema: Property[str] | None = None
    warehouse_id: Property[str] | None = None
    commands: Property[list[String]] | None = None

    def to_dbt_task(self, run_context: RunContext) -> DbtTask:
        raise NotImplementedError  # TODO: translate from Java
