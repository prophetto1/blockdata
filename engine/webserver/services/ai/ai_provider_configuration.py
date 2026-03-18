from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AiProviderConfiguration.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AiProviderConfiguration:
    id: str | None = None
    display_name: str | None = None
    type: str | None = None
    is_default: bool | None = None
    configuration: dict[str, Any] | None = None
