from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-email\src\main\java\io\kestra\plugin\email\MailSend.java
# WARNING: Unresolved types: AttachmentResource, Exception, JsonProcessingException, TransportStrategy

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class MailSend(Task):
    """Send email from a Flow task"""
    transport_strategy: Property[TransportStrategy] = Property.ofValue(TransportStrategy.SMTPS)
    session_timeout: Property[int] = Property.ofValue(10000)
    verify_server_identity: Property[bool] = Property.ofValue(true)
    host: Property[str] | None = None
    port: Property[int] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    trusted_hosts: Property[list[str]] | None = None
    from: Property[str] | None = None
    to: Property[str] | None = None
    cc: Property[str] | None = None
    subject: Property[str] | None = None
    html_text_content: Property[str] | None = None
    plain_text_content: Property[str] | None = None
    attachments: Property[Any] | None = None
    embedded_images: Property[Any] | None = None
    access_token: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def attachment_resources(self, attachments: list[Attachment], run_context: RunContext) -> list[AttachmentResource]:
        raise NotImplementedError  # TODO: translate from Java

    def get_attachments(self, attachments: Any) -> list[Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_json_attachment_string(self, json: str) -> list[Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_attachments(items: list[dict[str, Any]]) -> list[Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Attachment:
        uri: Property[str]
        name: Property[str]
        content_type: Property[str] = Property.ofValue("application/octet-stream")
