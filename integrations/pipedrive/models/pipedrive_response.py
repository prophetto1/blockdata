from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\models\PipedriveResponse.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PipedriveResponse:
    success: bool | None = None
    data: T | None = None
    error: str | None = None
    error_info: str | None = None
    additional_data: Any | None = None
