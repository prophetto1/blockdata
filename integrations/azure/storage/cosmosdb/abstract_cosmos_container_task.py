from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\AbstractCosmosContainerTask.java
# WARNING: Unresolved types: CosmosAsyncContainer, CosmosAsyncDatabase, Exception, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_database_task import AbstractCosmosDatabaseTask
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCosmosContainerTask(ABC, AbstractCosmosDatabaseTask):
    container_id: Property[str]

    def run(self, run_context: RunContext, cosmos_database: CosmosAsyncDatabase) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> T:
        ...
