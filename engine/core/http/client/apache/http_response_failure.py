from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\apache\HttpResponseFailure.java
# WARNING: Unresolved types: HttpContext, IOException, apache, core5, hc, http, org

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class HttpResponseFailure:

    @staticmethod
    def exception(response: org.apache.hc.core5.http.HttpResponse, context: HttpContext) -> HttpClientResponseException:
        raise NotImplementedError  # TODO: translate from Java
