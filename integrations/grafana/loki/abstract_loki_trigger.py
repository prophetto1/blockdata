from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-grafana\src\main\java\io\kestra\plugin\grafana\loki\AbstractLokiTrigger.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractLokiTrigger(ABC, AbstractTrigger):
    url: Property[str]
    connect_timeout: Property[int] = Property.ofValue(30)
    read_timeout: Property[int] = Property.ofValue(60)
    auth_token: Property[str] | None = None
    tenant_id: Property[str] | None = None

    def execute_get_req(self, run_context: RunContext, uri: str) -> HttpResponse[str]:
        raise NotImplementedError  # TODO: translate from Java

    def build_base_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_uri(self, endpoint: str, query_params: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
