from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\Batch.java
# WARNING: Unresolved types: CosmosAsyncContainer, CosmosBatchOperationResult, CosmosBatchResponse, CosmosDiagnostics, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.azure.storage.cosmosdb.abstract_cosmos_container_task import AbstractCosmosContainerTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Batch(AbstractCosmosContainerTask):
    """Run transactional batch creates"""
    partition_key_value: Property[str]
    items: Property[list[dict[str, Any]]]

    def run(self, run_context: RunContext, cosmos_container: CosmosAsyncContainer) -> BatchResponseOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BatchResponseOutput:
        response_headers: dict[str, str] | None = None
        status_code: int | None = None
        sub_status_code: int | None = None
        error_message: str | None = None
        results: list[CosmosBatchOperationResult] | None = None
        diagnostics: CosmosDiagnostics | None = None
        request_charge: float | None = None
        session_token: str | None = None
        activity_id: str | None = None
        retry_after_duration: timedelta | None = None
        response_length: int | None = None
        duration: timedelta | None = None
        success_status_code: bool | None = None

        @staticmethod
        def from(r: CosmosBatchResponse) -> BatchResponseOutput:
            raise NotImplementedError  # TODO: translate from Java
