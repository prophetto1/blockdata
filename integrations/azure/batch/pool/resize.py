from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.dataproc.batches.abstract_batch import AbstractBatch
from integrations.azure.batch.models.pool import Pool
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Resize(AbstractBatch, RunnableTask):
    """Resize an Azure Batch pool"""
    pool_id: Property[str]
    target_dedicated_nodes: Property[int]
    target_low_priority_nodes: Property[int]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        pool: Pool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    pool: Pool | None = None
