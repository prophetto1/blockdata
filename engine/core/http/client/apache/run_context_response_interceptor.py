from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\apache\RunContextResponseInterceptor.java
# WARNING: Unresolved types: ClassicHttpResponse, EntityDetails, HttpContext, HttpException, HttpResponseInterceptor, IOException

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class RunContextResponseInterceptor:
    run_context: RunContext | None = None

    def process(self, response: HttpResponse, entity: EntityDetails, context: HttpContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, request: HttpRequest, response: ClassicHttpResponse) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
