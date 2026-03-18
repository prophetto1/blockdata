from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\pool\Resize.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.batch.abstract_batch import AbstractBatch
from integrations.azure.batch.models.pool import Pool
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Resize(AbstractBatch):
    """Resize an Azure Batch pool"""
    pool_id: Property[str]
    target_dedicated_nodes: Property[int] = Property.ofValue(0)
    target_low_priority_nodes: Property[int] = Property.ofValue(0)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        pool: Pool | None = None
