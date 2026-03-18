from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\responses\BulkResponse.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class BulkResponse:
    count: int | None = None
