from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_database_task import AbstractCosmosDatabaseTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCosmosContainerTask(AbstractCosmosDatabaseTask):
    container_id: Property[str]

    def run(self, run_context: RunContext, cosmos_database: CosmosAsyncDatabase) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> T:
        raise NotImplementedError  # TODO: translate from Java
