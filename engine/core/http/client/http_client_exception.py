from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\HttpClientException.java
# WARNING: Unresolved types: HttpException

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class HttpClientException(ABC, HttpException):
    serial_version_uid: ClassVar[int] = 1
