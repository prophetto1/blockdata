from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PipelineTaskSetting:
    pipeline_id: Property[str] | None = None
    full_refresh: Property[bool] | None = None

    def to_pipeline_task(self, run_context: RunContext) -> PipelineTask:
        raise NotImplementedError  # TODO: translate from Java
