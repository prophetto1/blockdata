from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-resend\src\main\java\io\kestra\plugin\resend\email\Send.java
# WARNING: Unresolved types: Exception, com, core, emails, io, kestra, model, models, resend, services, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.docker.tag import Tag
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Send(Task):
    """Send email via Resend API"""
    api_key: Property[str]
    from: Property[str]
    to: Property[list[str]]
    subject: Property[str]
    cc: Property[list[str]] | None = None
    bcc: Property[list[str]] | None = None
    reply_to: Property[list[str]] | None = None
    html: Property[str] | None = None
    text: Property[str] | None = None
    headers: Property[dict[str, str]] | None = None
    idempotency_key: Property[str] | None = None
    scheduled_at: Property[str] | None = None
    attachments: Property[list[Attachment]] | None = None
    tags: Property[list[Tag]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def attachment_resources(self, list: list[Attachment], run_context: RunContext) -> list[com.resend.services.emails.model.Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Attachment:
        name: Property[str]
        uri: Property[str] | None = None
        path: Property[str] | None = None
        content_id: Property[str] | None = None
        content_type: Property[str] | None = None

    @dataclass(slots=True)
    class Output:
        id: str | None = None
