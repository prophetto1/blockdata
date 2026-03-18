from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\Get.java
# WARNING: Unresolved types: Exception, MessagePart, core, googleworkspace, io, java, kestra, mail, models, plugin, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.mail.abstract_mail import AbstractMail
from integrations.googleworkspace.mail.models.attachment import Attachment
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractMail):
    """Fetch a Gmail message by ID"""
    message_id: Property[str]
    format: Property[str] = Property.ofValue("full")

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def convert_message(self, message: Message) -> io.kestra.plugin.googleworkspace.mail.models.Message:
        raise NotImplementedError  # TODO: translate from Java

    def parse_email_list(self, email_header: str) -> java.util.List[str]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_body_and_attachments(self, part: MessagePart, attachments: java.util.List[Attachment]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def is_attachment(self, part: MessagePart) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_filename(self, part: MessagePart) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        message: io.kestra.plugin.googleworkspace.mail.models.Message | None = None
