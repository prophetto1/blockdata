from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.outlook.abstract_microsoft_graph_identity_connection import AbstractMicrosoftGraphIdentityConnection
from integrations.microsoft365.outlook.domain.message_detail import MessageDetail
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractMicrosoftGraphIdentityConnection):
    """Get Outlook email message"""
    message_id: Property[str]
    include_attachments: Property[bool] = Property.ofValue(false)
    user_email: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        message: MessageDetail | None = None
