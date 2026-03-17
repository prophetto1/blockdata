from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\AbstractWebhookTrigger.java
# WARNING: Unresolved types: Exception, Mono

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.http.http_response import HttpResponse
from engine.plugin.core.trigger.webhook_context import WebhookContext


@dataclass(slots=True, kw_only=True)
class AbstractWebhookTrigger(ABC, AbstractTrigger):
    key: str
    inputs: dict[str, Any] | None = None

    @abstractmethod
    def evaluate(self, context: WebhookContext) -> Mono[HttpResponse[Any]]:
        ...
