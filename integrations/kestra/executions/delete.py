from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractKestraTask, RunnableTask):
    """Delete a terminated execution"""
    execution_id: Property[str]
    delete_logs: Property[bool] | None = None
    delete_metrics: Property[bool] | None = None
    delete_storage: Property[bool] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated(self, state_type: StateType) -> bool:
        raise NotImplementedError  # TODO: translate from Java
