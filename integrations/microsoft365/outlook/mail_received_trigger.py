from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\MailReceivedTrigger.java
# WARNING: Unresolved types: Exception, GraphServiceClient, Logger, On, core, io, kestra, models, org, runners, slf4j, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.microsoft365.outlook.abstract_microsoft_graph_identity_polling_trigger import AbstractMicrosoftGraphIdentityPollingTrigger
from integrations.googleworkspace.mail.models.attachment import Attachment
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class MailReceivedTrigger(AbstractMicrosoftGraphIdentityPollingTrigger):
    """Trigger on new Outlook mail"""
    interval: timedelta = Duration.ofMinutes(5)
    folder_id: Property[str] = Property.ofValue("inbox")
    include_attachments: Property[bool] = Property.ofValue(false)
    max_messages: Property[int] = Property.ofValue(10)
    user_email: Property[str] | None = None
    filter: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def build_email_message(self, message: Message, client: GraphServiceClient, user: str, include_attachments: bool, run_context: io.kestra.core.runners.RunContext, logger: org.slf4j.Logger) -> EmailMessage:
        raise NotImplementedError  # TODO: translate from Java

    def get_attachment_content(self, attachment: Attachment, logger: Logger) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def get_on(self) -> Property[On]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages: list[EmailMessage] | None = None
        count: int | None = None
        folder_id: str | None = None

    @dataclass(slots=True)
    class EmailMessage:
        id: str | None = None
        subject: str | None = None
        from: str | None = None
        from_name: str | None = None
        to_recipients: list[str] | None = None
        cc_recipients: list[str] | None = None
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
