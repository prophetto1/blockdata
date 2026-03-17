from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\flows\Export.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Export(AbstractKestraTask):
    """Export flows by namespace/labels"""
    namespace: Property[str] | None = None
    labels: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Export.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        flows_zip: str | None = None
