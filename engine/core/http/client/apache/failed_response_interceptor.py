from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\apache\FailedResponseInterceptor.java
# WARNING: Unresolved types: EntityDetails, HttpContext, HttpException, HttpResponseInterceptor, IOException, apache, core5, hc, http, org

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class FailedResponseInterceptor:
    all_errors: bool | None = None
    status_codes: list[int] | None = None

    def process(self, response: org.apache.hc.core5.http.HttpResponse, entity: EntityDetails, context: HttpContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def raise_error(self, response: org.apache.hc.core5.http.HttpResponse, context: HttpContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
