from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\List.java
# WARNING: Unresolved types: Exception, IOException, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.microsoft365.outlook.abstract_microsoft_graph_identity_connection import AbstractMicrosoftGraphIdentityConnection
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.microsoft365.outlook.domain.message_summary import MessageSummary
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractMicrosoftGraphIdentityConnection):
    """List Outlook emails"""
    user_email: Property[str]
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    folder_id: Property[str] | None = None
    filter: Property[str] | None = None
    top: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_messages(self, run_context: RunContext, messages: java.util.List[MessageSummary]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages: java.util.List[MessageSummary] | None = None
        message: MessageSummary | None = None
        uri: str | None = None
        count: int | None = None
        folder_id: str | None = None
        has_next_page: bool | None = None
