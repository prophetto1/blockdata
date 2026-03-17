from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.models.tasks.output import Output
from integrations.azure.storage.cosmosdb.partition_key_definition import PartitionKeyDefinition
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Queries(AbstractCosmosContainerTask, RunnableTask):
    """Run multiple Cosmos queries"""
    log: Logger | None = None
    queries: Property[dict[String, QueriesOptions]]

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_request_options(self, options: QueriesOptions) -> CosmosQueryRequestOptions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class QueriesOptions:
        query: str
        exclude_regions: list[String] | None = None
        partition_key: dict[String, Object] | None = None
        partition_key_definition: PartitionKeyDefinition | None = None
        feed_range_partition_key: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class QueriesOptions:
    query: str
    exclude_regions: list[String] | None = None
    partition_key: dict[String, Object] | None = None
    partition_key_definition: PartitionKeyDefinition | None = None
    feed_range_partition_key: dict[String, Object] | None = None
