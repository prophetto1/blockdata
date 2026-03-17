from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\MailReceivedTrigger.java
# WARNING: Unresolved types: Exception, Gmail, HttpCredentialsAdapter, Logger, NetHttpTransport, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.googleworkspace.mail.models.email_metadata import EmailMetadata
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from integrations.googleworkspace.o_auth_interface import OAuthInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class MailReceivedTrigger(AbstractTrigger):
    """Poll Gmail for newly received emails"""
    client_id: Property[str]
    client_secret: Property[str]
    refresh_token: Property[str]
    scopes: Property[list[str]] = Property.ofValue(List.of(
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send"
    ))
    read_timeout: Property[int] = Property.ofValue(120)
    include_spam_trash: Property[bool] = Property.ofValue(false)
    interval: timedelta = Duration.ofMinutes(5)
    max_messages_per_poll: Property[int] = Property.ofValue(50)
    access_token: Property[str] | None = None
    query: Property[str] | None = None
    label_ids: Property[list[str]] | None = None
    initial_lookback: Property[timedelta] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def connection(self, run_context: RunContext) -> Gmail:
        raise NotImplementedError  # TODO: translate from Java

    def oauth_credentials(self, run_context: RunContext) -> HttpCredentialsAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def net_http_transport(self) -> NetHttpTransport:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def calculate_cutoff_time(self, run_context: RunContext, context: TriggerContext, logger: Logger) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_messages(self, gmail: Gmail, run_context: RunContext, cutoff_time: datetime, logger: Logger) -> list[Message]:
        raise NotImplementedError  # TODO: translate from Java

    def filter_and_enrich_messages(self, gmail: Gmail, messages: list[Message], cutoff_time: datetime, run_context: RunContext, logger: Logger) -> list[EmailMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def build_search_query(self, run_context: RunContext, cutoff_time: datetime) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_email_metadata(self, message: Message) -> EmailMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def parse_email_list(self, email_header: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages: list[EmailMetadata] | None = None
