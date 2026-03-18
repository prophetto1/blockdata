from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\flows\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractKestraTask):
    """List flows in a namespace"""
    namespace: Property[str] | None = None

    def run(self, run_context: RunContext) -> List.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        flows: java.util.List[Flow] | None = None
