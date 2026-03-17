from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\assets\Set.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Set(AbstractKestraTask):
    """Create or update an asset"""
    asset_id: Property[str]
    asset_type: Property[str]
    namespace: Property[str] | None = None
    display_name: Property[str] | None = None
    asset_description: Property[str] | None = None
    metadata: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
