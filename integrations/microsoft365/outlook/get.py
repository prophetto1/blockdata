from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.outlook.abstract_microsoft_graph_identity_connection import AbstractMicrosoftGraphIdentityConnection
from integrations.microsoft365.outlook.domain.message_detail import MessageDetail
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractMicrosoftGraphIdentityConnection, RunnableTask):
    """Get Outlook email message"""
    message_id: Property[str]
    include_attachments: Property[bool] | None = None
    user_email: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        message: MessageDetail | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    message: MessageDetail | None = None
