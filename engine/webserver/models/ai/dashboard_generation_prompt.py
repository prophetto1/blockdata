from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\ai\DashboardGenerationPrompt.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class DashboardGenerationPrompt:
    conversation_id: str | None = None
    user_prompt: str | None = None
    yaml: str | None = None
    provider_id: str | None = None
