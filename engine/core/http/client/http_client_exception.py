from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\HttpClientException.java
# WARNING: Unresolved types: HttpException, Throwable

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class HttpClientException(ABC, HttpException):
    serial_version_u_i_d: ClassVar[int] = 1
