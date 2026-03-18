from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\ApifyTempFileRuntimeException.java
# WARNING: Unresolved types: RuntimeException, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ApifyTempFileRuntimeException(RuntimeException):
    pass
