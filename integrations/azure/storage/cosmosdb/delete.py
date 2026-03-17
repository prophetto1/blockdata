from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\Delete.java
# WARNING: Unresolved types: CosmosAsyncContainer, CosmosDiagnostics, CosmosItemResponse, azure, com, core, cosmos, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractCosmosContainerTask):
    """Delete one Cosmos document"""
    item: Property[dict[str, Any]]

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        item: Any | None = None
        max_resource_quota: str | None = None
        current_resource_quota_usage: str | None = None
        activity_id: str | None = None
        request_charge: float | None = None
        status_code: int | None = None
        session_token: str | None = None
        response_headers: dict[str, str] | None = None
        diagnostics: CosmosDiagnostics | None = None
        duration: timedelta | None = None
        e_tag: str | None = None

        @staticmethod
        def from(r: com.azure.cosmos.models.CosmosItemResponse[Any]) -> Output:
            raise NotImplementedError  # TODO: translate from Java
