from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateItem(AbstractCosmosContainerTask, RunnableTask):
    """Create one Cosmos document"""
    item: Property[dict[String, Object]]

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> Output:
        raise NotImplementedError  # TODO: translate from Java
