from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\gemini\GeminiConfiguration.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.webserver.services.ai.ai_configuration import AiConfiguration


@dataclass(slots=True, kw_only=True)
class GeminiConfiguration:
    base_url: str | None = None
    api_key: str | None = None
    model_name: str | None = None
    temperature: float | None = None
    top_p: float | None = None
    top_k: int | None = None
    client_pem: str | None = None
    ca_pem: str | None = None
    max_output_tokens: int | None = None
    log_requests: bool | None = None
    log_responses: bool | None = None
    timeout: timedelta | None = None

    def type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
