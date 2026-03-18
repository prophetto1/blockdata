from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\notifications\SlackIncomingWebhook.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_webhook_connection import AbstractSlackWebhookConnection
from integrations.slack.message_payload_interface import MessagePayloadInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.singer.taps.slack import Slack
from engine.core.models.tasks.void_output import VoidOutput
from engine.plugin.core.trigger.webhook_response import WebhookResponse


@dataclass(slots=True, kw_only=True)
class SlackIncomingWebhook(AbstractSlackWebhookConnection):
    """Send a Slack message using an Incoming Webhook."""
    payload: Property[str] | None = None
    message_text: Property[str] | None = None
    url: str | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def create_configured_slack_instance(self, run_context: RunContext) -> Slack:
        raise NotImplementedError  # TODO: translate from Java

    def send_with_custom_headers(self, run_context: RunContext, url: str, payload_json: str) -> WebhookResponse:
        raise NotImplementedError  # TODO: translate from Java
