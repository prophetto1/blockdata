from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\logs\Fetch.java
# WARNING: Unresolved types: Exception, Level, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Fetch(AbstractKestraTask):
    """Fetch execution logs to storage"""
    level: Property[Level] = Property.of(Level.INFO)
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    execution_id: Property[str] | None = None
    tasks_id: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        uri: str | None = None
