from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.cli.app import App
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.plugin.core.http.request import Request
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_output import TriggerOutput
from engine.plugin.core.trigger.webhook_context import WebhookContext


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractWebhookTrigger, TriggerOutput):
    """Trigger flows from Slack Events API"""
    m_a_p__t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[Map[String, Object]] | None = None
    m_a_p_p_e_r: ObjectMapper | None = None
    bot_token: Property[str] | None = None
    signing_secret: Property[str] | None = None

    def evaluate(self, context: WebhookContext) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def http_headers(self, response: Response) -> HttpHeaders:
        raise NotImplementedError  # TODO: translate from Java

    def app_config(self, context: WebhookContext, run_context: RunContext) -> AppConfig:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, context: WebhookContext, run_context: RunContext, events_api_payload: EventsApiPayload[Any], slack_context: com) -> com:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, context: WebhookContext, run_context: RunContext, request: com, slack_context: com) -> com:
        raise NotImplementedError  # TODO: translate from Java

    def extract_payload(self, request: com) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, context: WebhookContext, run_context: RunContext, body: dict[String, Object], slack_context: com) -> com:
        raise NotImplementedError  # TODO: translate from Java

    def parse_request(self, request: HttpRequest, context: WebhookContext, run_context: RunContext) -> Request[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def body(self, body: HttpRequest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def remote_address(self, request: HttpRequest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def app(self, context: WebhookContext, run_context: RunContext) -> App:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        body: Any
        headers: dict[String, List[String]]
        parameters: dict[String, List[String]]
        token: EncryptedString


@dataclass(slots=True, kw_only=True)
class Output(io):
    body: Any
    headers: dict[String, List[String]]
    parameters: dict[String, List[String]]
    token: EncryptedString
