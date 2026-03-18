from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\AbstractShopifyTask.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractShopifyTask(ABC, Task):
    store_domain: Property[str]
    access_token: Property[str]
    api_version: Property[str] = Property.of("2024-10")
    rate_limit_delay: Property[timedelta] = Property.of(Duration.ofMillis(500))

    def build_api_url(self, run_context: RunContext, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_authenticated_request(self, run_context: RunContext, method: str, uri: str, body: Any) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def handle_rate_limit(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def parse_response(self, response: HttpResponse[str]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
