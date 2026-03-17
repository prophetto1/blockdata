from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zendesk\src\main\java\io\kestra\plugin\zendesk\tickets\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.zendesk.zendesk_connection import ZendeskConnection


@dataclass(slots=True, kw_only=True)
class Create(ZendeskConnection):
    """Create a Zendesk ticket"""
    subject: Property[str] | None = None
    description: str | None = None
    priority: Property[Priority] | None = None
    ticket_type: Property[Type] | None = None
    assignee_id: Property[int] | None = None
    tags: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Create.Output:
        raise NotImplementedError  # TODO: translate from Java

    class Priority(str, Enum):
        URGENT = "URGENT"
        HIGH = "HIGH"
        NORMAL = "NORMAL"
        LOW = "LOW"

    class Type(str, Enum):
        PROBLEM = "PROBLEM"
        INCIDENT = "INCIDENT"
        QUESTION = "QUESTION"
        TASK = "TASK"

    @dataclass(slots=True)
    class Output:
        url: str | None = None
        id: int | None = None
