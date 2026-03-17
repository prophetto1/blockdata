from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\Send.java
# WARNING: Unresolved types: Exception, IOException, MessagingException, MimeMessage, MimePart, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.mail.abstract_mail import AbstractMail
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Send(AbstractMail):
    """Send an email with Gmail API"""
    to: Property[list[str]]
    cc: Property[list[str]] | None = None
    bcc: Property[list[str]] | None = None
    subject: Property[str] | None = None
    text_body: Property[str] | None = None
    html_body: Property[str] | None = None
    from: Property[str] | None = None
    attachments: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_email(self, run_context: RunContext) -> MimeMessage:
        raise NotImplementedError  # TODO: translate from Java

    def create_message_with_email(self, email: MimeMessage) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        message_id: str | None = None
        thread_id: str | None = None
