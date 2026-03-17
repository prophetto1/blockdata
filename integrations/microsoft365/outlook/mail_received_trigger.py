from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.microsoft365.outlook.abstract_microsoft_graph_identity_polling_trigger import AbstractMicrosoftGraphIdentityPollingTrigger
from integrations.googleworkspace.mail.models.attachment import Attachment
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.mqtt.services.message import Message
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class MailReceivedTrigger(AbstractMicrosoftGraphIdentityPollingTrigger, TriggerOutput, StatefulTriggerInterface):
    """Trigger on new Outlook mail"""
    interval: timedelta | None = None
    folder_id: Property[str] | None = None
    user_email: Property[str] | None = None
    filter: Property[str] | None = None
    include_attachments: Property[bool] | None = None
    max_messages: Property[int] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def build_email_message(self, message: Message, client: GraphServiceClient, user: str, include_attachments: bool, run_context: io, logger: org) -> EmailMessage:
        raise NotImplementedError  # TODO: translate from Java

    def get_attachment_content(self, attachment: Attachment, logger: Logger) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    def get_on(self) -> Property[On]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages: list[EmailMessage] | None = None
        count: int | None = None
        folder_id: str | None = None

    @dataclass(slots=True)
    class EmailMessage:
        id: str | None = None
        subject: str | None = None
        from: str | None = None
        from_name: str | None = None
        to_recipients: list[String] | None = None
        cc_recipients: list[String] | None = None
        received_date_time: datetime | None = None
        sent_date_time: datetime | None = None
        has_attachments: bool | None = None
        is_read: bool | None = None
        importance: str | None = None
        body_preview: str | None = None
        body: str | None = None
        body_content_type: str | None = None
        attachments: list[AttachmentData] | None = None

    @dataclass(slots=True)
    class AttachmentData:
        id: str | None = None
        name: str | None = None
        content_type: str | None = None
        size: int | None = None
        is_inline: bool | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages: list[EmailMessage] | None = None
    count: int | None = None
    folder_id: str | None = None


@dataclass(slots=True, kw_only=True)
class EmailMessage:
    id: str | None = None
    subject: str | None = None
    from: str | None = None
    from_name: str | None = None
    to_recipients: list[String] | None = None
    cc_recipients: list[String] | None = None
    received_date_time: datetime | None = None
    sent_date_time: datetime | None = None
    has_attachments: bool | None = None
    is_read: bool | None = None
    importance: str | None = None
    body_preview: str | None = None
    body: str | None = None
    body_content_type: str | None = None
    attachments: list[AttachmentData] | None = None


@dataclass(slots=True, kw_only=True)
class AttachmentData:
    id: str | None = None
    name: str | None = None
    content_type: str | None = None
    size: int | None = None
    is_inline: bool | None = None
    uri: str | None = None
