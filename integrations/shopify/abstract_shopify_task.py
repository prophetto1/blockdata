from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractShopifyTask(Task):
    store_domain: Property[str]
    access_token: Property[str]
    api_version: Property[str] | None = None
    rate_limit_delay: Property[timedelta] | None = None

    def build_api_url(self, run_context: RunContext, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_authenticated_request(self, run_context: RunContext, method: str, uri: str, body: Any) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def handle_rate_limit(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def parse_response(self, response: HttpResponse[String]) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
