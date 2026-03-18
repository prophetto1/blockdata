from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\AbstractWebhookTrigger.java

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.plugin.core.trigger.webhook_context import WebhookContext


@dataclass(slots=True, kw_only=True)
class AbstractWebhookTrigger(ABC, AbstractTrigger):
    key: str
    logger: ClassVar[Logger] = getLogger(__name__)
    inputs: dict[str, Any] | None = None

    @abstractmethod
    def evaluate(self, context: WebhookContext) -> Mono[HttpResponse[Any]]:
        ...
