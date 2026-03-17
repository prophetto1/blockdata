from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\slack\SlackIncomingWebhook.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.abstract_http_options_task import AbstractHttpOptionsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SlackIncomingWebhook(AbstractHttpOptionsTask):
    """Send a Slack message using an Incoming Webhook."""
    url: str | None = None
    payload: Property[str] | None = None
    message_text: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def prepare_message(self, run_context: RunContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def to_slack_mrkdwn(self, text: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
