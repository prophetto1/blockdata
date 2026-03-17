from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\HttpClientException.java
# WARNING: Unresolved types: HttpException, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class HttpClientException(HttpException):
    serial_version_u_i_d: int = 1
