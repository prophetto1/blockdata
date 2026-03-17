from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\StaticFilter.java
# WARNING: Unresolved types: HttpServerFilter, MutableHttpResponse, Publisher, ServerFilterChain

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class StaticFilter:
    base_path: str | None = None
    google_analytics: str | None = None
    html_title: str | None = None
    html_head: str | None = None

    def do_filter(self, request: HttpRequest[Any], chain: ServerFilterChain) -> Publisher[MutableHttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def replace(self, line: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
