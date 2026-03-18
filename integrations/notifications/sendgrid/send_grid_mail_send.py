from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\sendgrid\SendGridMailSend.java
# WARNING: Unresolved types: Attachments, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class SendGridMailSend(Task):
    """Send an automated SendGrid email from a workflow."""
    sendgrid_api_key: str
    from: str
    to: list[str] | None = None
    cc: Property[list[str]] | None = None
    subject: Property[str] | None = None
    html_content: Property[str] | None = None
    text_content: Property[str] | None = None
    attachments: list[Attachment] | None = None
    embedded_images: list[Attachment] | None = None

    def run(self, run_context: RunContext) -> SendGridMailSend.Output:
        raise NotImplementedError  # TODO: translate from Java

    def attachment_resources(self, list: list[Attachment], run_context: RunContext) -> list[Attachments]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Attachment:
        uri: Property[str]
        name: Property[str]
        content_type: Property[str] = Property.ofValue("application/octet-stream")

    @dataclass(slots=True)
    class Output:
        body: str | None = None
        headers: dict[str, str] | None = None
        status_code: int | None = None
