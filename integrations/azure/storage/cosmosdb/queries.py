from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\Queries.java
# WARNING: Unresolved types: CosmosAsyncContainer, CosmosQueryRequestOptions, Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.azure.storage.cosmosdb.partition_key_definition import PartitionKeyDefinition
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Queries(AbstractCosmosContainerTask):
    """Run multiple Cosmos queries"""
    queries: Property[dict[str, QueriesOptions]]
    log: ClassVar[Logger] = LoggerFactory.getLogger(Queries.class)

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_request_options(options: QueriesOptions) -> CosmosQueryRequestOptions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class QueriesOptions:
        query: str
        exclude_regions: list[str] | None = None
        partition_key: dict[str, Any] | None = None
        partition_key_definition: PartitionKeyDefinition | None = None
        feed_range_partition_key: dict[str, Any] | None = None

    @dataclass(slots=True)
    class Output:
        results: dict[str, list[dict]] | None = None
