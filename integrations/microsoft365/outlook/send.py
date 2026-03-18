from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\Send.java
# WARNING: Unresolved types: Exception, JsonProcessingException, Recipient, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.outlook.abstract_microsoft_graph_identity_connection import AbstractMicrosoftGraphIdentityConnection
from integrations.googleworkspace.mail.models.attachment import Attachment
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Send(AbstractMicrosoftGraphIdentityConnection):
    """Send email via Microsoft Graph"""
    to: Property[list[str]]
    subject: Property[str]
    body: Property[str]
    from: Property[str]
    cc: Property[list[str]] | None = None
    bcc: Property[list[str]] | None = None
    body_type: Property[str] | None = None
    attachments: Property[Any] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def create_recipient(self, email: str) -> Recipient:
        raise NotImplementedError  # TODO: translate from Java

    def create_message_attachments(self, attachments: list[AttachmentInput], run_context: RunContext) -> list[Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    def get_attachments(self, attachments: Any) -> list[AttachmentInput]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_json_attachment_string(self, json: str) -> list[AttachmentInput]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_attachments(items: list[dict[str, Any]]) -> list[AttachmentInput]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AttachmentInput:
        uri: Property[str]
        name: Property[str]
        content_type: Property[str] = Property.ofValue("application/octet-stream")

    @dataclass(slots=True)
    class Output:
        subject: str | None = None
        to_count: int | None = None
        cc_count: int | None = None
        bcc_count: int | None = None
        body_type: str | None = None
