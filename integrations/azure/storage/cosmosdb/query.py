from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\Query.java
# WARNING: Unresolved types: CosmosAsyncContainer, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.azure.storage.cosmosdb.partition_key_definition import PartitionKeyDefinition
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractCosmosContainerTask):
    """Run one Cosmos query"""
    query: Property[str]
    exclude_regions: Property[list[str]] | None = None
    partition_key: Property[dict[str, Any]] | None = None
    partition_key_definition: Property[PartitionKeyDefinition] | None = None
    feed_range_partition_key: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        query_results: list[dict] | None = None
