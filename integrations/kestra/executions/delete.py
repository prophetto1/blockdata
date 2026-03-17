from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\executions\Delete.java
# WARNING: Unresolved types: Exception, StateType

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractKestraTask):
    """Delete a terminated execution"""
    execution_id: Property[str]
    delete_logs: Property[bool] = Property.ofValue(true)
    delete_metrics: Property[bool] = Property.ofValue(true)
    delete_storage: Property[bool] = Property.ofValue(true)

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated(self, state_type: StateType) -> bool:
        raise NotImplementedError  # TODO: translate from Java
