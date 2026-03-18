from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\monitoring\AbstractMonitoringTask.java
# WARNING: Unresolved types: Exception, MetricsClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMonitoringTask(ABC, AbstractAzureIdentityConnection):
    endpoint: Property[str]

    def query_client(self, run_context: RunContext) -> MetricsClient:
        raise NotImplementedError  # TODO: translate from Java

    def ingest_metrics(self, run_context: RunContext, path: str, body: dict[str, Any]) -> HttpResponse[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java
