from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\ConcurrencyLimitController.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.core.services.concurrency_limit_service import ConcurrencyLimitService
from engine.core.http.http_response import HttpResponse
from engine.webserver.responses.paged_results import PagedResults
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class ConcurrencyLimitController:
    concurrency_limit_service: ConcurrencyLimitService | None = None
    tenant_service: TenantService | None = None

    def search_concurrency_limits(self) -> PagedResults[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java

    def update_concurrency_limit(self, concurrency_limit: ConcurrencyLimit) -> HttpResponse[ConcurrencyLimit]:
        raise NotImplementedError  # TODO: translate from Java
