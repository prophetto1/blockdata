from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Set(AbstractKestraTask, RunnableTask):
    """Create or update an asset"""
    namespace: Property[str] | None = None
    asset_id: Property[str]
    asset_type: Property[str]
    display_name: Property[str] | None = None
    asset_description: Property[str] | None = None
    metadata: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
