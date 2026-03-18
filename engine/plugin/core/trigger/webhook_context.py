from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\WebhookContext.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.core.models.flows.flow import Flow
from engine.core.services.webhook_service import WebhookService


@dataclass(slots=True, kw_only=True)
class WebhookContext:
    request: HttpRequest | None = None
    path: str | None = None
    flow: Flow | None = None
    trigger: AbstractWebhookTrigger | None = None
    webhook_service: WebhookService | None = None
