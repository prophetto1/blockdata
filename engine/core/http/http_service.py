from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\HttpService.java
# WARNING: Unresolved types: Header, HttpEntity, HttpHeaders, IOException

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class HttpService:

    @staticmethod
    def safe_u_r_i(request: HttpRequest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_http_headers(headers: list[Header]) -> HttpHeaders:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def copy(entity: HttpEntity) -> HttpEntityCopy:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class HttpEntityCopy:
        entity: HttpEntity | None = None
        body: list[int] | None = None
