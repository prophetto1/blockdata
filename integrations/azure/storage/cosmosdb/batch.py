from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Batch(AbstractCosmosContainerTask, RunnableTask):
    """Run transactional batch creates"""
    partition_key_value: Property[str]
    items: Property[list[Map[String, Object]]]

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> BatchResponseOutput:
        raise NotImplementedError  # TODO: translate from Java
