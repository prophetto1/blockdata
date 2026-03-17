from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-grafana\src\main\java\io\kestra\plugin\grafana\loki\AbstractLokiConnection.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractLokiConnection(ABC, Task):
    url: Property[str]
    query: Property[str]
    connect_timeout: Property[int] = Property.ofValue(30)
    read_timeout: Property[int] = Property.ofValue(60)
    limit: Property[int] = Property.ofValue(100)
    direction: Property[Direction] = Property.ofValue(Direction.BACKWARD)
    auth_token: Property[str] | None = None
    tenant_id: Property[str] | None = None

    def execute_get_req(self, run_context: RunContext, uri: str) -> HttpResponse[str]:
        raise NotImplementedError  # TODO: translate from Java

    def build_base_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_uri(self, endpoint: str, query_params: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class Direction(str, Enum):
        FORWARD = "FORWARD"
        BACKWARD = "BACKWARD"
