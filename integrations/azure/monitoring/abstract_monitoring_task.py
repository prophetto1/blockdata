from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMonitoringTask(AbstractAzureIdentityConnection):
    endpoint: Property[str]

    def query_client(self, run_context: RunContext) -> MetricsClient:
        raise NotImplementedError  # TODO: translate from Java

    def ingest_metrics(self, run_context: RunContext, path: str, body: dict[String, Object]) -> HttpResponse[Map[String, Object]]:
        raise NotImplementedError  # TODO: translate from Java
