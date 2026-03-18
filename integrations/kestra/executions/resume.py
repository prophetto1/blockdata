from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\executions\Resume.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Resume(AbstractKestraTask):
    """Resume a paused execution"""
    execution_id: Property[str] | None = None
    inputs: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
