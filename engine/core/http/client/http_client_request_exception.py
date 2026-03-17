from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\HttpClientRequestException.java
# WARNING: Unresolved types: Throwable

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class HttpClientRequestException(HttpClientException):
    serial_version_u_i_d: int = 1
    request: HttpRequest | None = None
