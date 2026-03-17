from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\Webhook.java
# WARNING: Unresolved types: Exception, Mono, ObjectMapper, Status, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_output import TriggerOutput
from engine.plugin.core.trigger.webhook_context import WebhookContext


@dataclass(slots=True, kw_only=True)
class Webhook(AbstractWebhookTrigger):
    """Trigger a Flow via an authenticated webhook URL."""
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson().copy()
        .setDefaultPropertyInclusion(JsonInclude.Include.USE_DEFAULTS)
    wait: bool = False
    return_outputs: bool = False
    response_content_type: str | None = None
    response_code: Property[int] | None = None

    def evaluate(self, context: WebhookContext) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def build_output_response(self, body: Any, response_content_type: str, response_code: HttpResponse.Status) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def try_map(body: str) -> Optional[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def try_array(body: str) -> Optional[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        body: Any
        headers: dict[str, list[str]]
        parameters: dict[str, list[str]]
