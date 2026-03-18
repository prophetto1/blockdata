from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AiProvidersConfiguration.java

from dataclasses import dataclass
from typing import Any

from engine.webserver.services.ai.ai_provider_configuration import AiProviderConfiguration


@dataclass(slots=True, kw_only=True)
class AiProvidersConfiguration:
    providers: list[AiProviderConfiguration] | None = None
