from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\Trigger.java
# WARNING: Unresolved types: AppConfig, Context, EventsApiPayload, Exception, HttpHeaders, Mono, ObjectMapper, RequestBody, Response, TypeReference, api, bolt, com, context, core, io, kestra, models, request, response, slack, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.core.trigger.abstract_webhook_trigger import AbstractWebhookTrigger
from engine.cli.app import App
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.elasticsearch.request import Request
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_output import TriggerOutput
from engine.plugin.core.trigger.webhook_context import WebhookContext


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractWebhookTrigger):
    """Trigger flows from Slack Events API"""
    m_a_p__t_y_p_e__r_e_f_e_r_e_n_c_e: ClassVar[TypeReference[dict[str, Any]]] = new TypeReference<>() {}
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson().copy().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
    bot_token: Property[str] | None = None
    signing_secret: Property[str] | None = None

    def evaluate(self, context: WebhookContext) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def http_headers(response: Response) -> HttpHeaders:
        raise NotImplementedError  # TODO: translate from Java

    def app_config(self, context: WebhookContext, run_context: RunContext) -> AppConfig:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, context: WebhookContext, run_context: RunContext, events_api_payload: EventsApiPayload[Any], slack_context: com.slack.api.bolt.context.Context) -> com.slack.api.bolt.response.Response:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, context: WebhookContext, run_context: RunContext, request: com.slack.api.bolt.request.Request[Any], slack_context: com.slack.api.bolt.context.Context) -> com.slack.api.bolt.response.Response:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_payload(request: com.slack.api.bolt.request.Request[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, context: WebhookContext, run_context: RunContext, body: dict[str, Any], slack_context: com.slack.api.bolt.context.Context) -> com.slack.api.bolt.response.Response:
        raise NotImplementedError  # TODO: translate from Java

    def parse_request(self, request: HttpRequest, context: WebhookContext, run_context: RunContext) -> Request[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def body(body: HttpRequest.RequestBody) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def remote_address(request: HttpRequest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def app(self, context: WebhookContext, run_context: RunContext) -> App:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        body: Any
        headers: dict[str, list[str]]
        parameters: dict[str, list[str]]
        token: EncryptedString
