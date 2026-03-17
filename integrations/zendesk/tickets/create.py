from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.zendesk.zendesk_connection import ZendeskConnection


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


@dataclass(slots=True, kw_only=True)
class Create(ZendeskConnection, RunnableTask):
    """Create a Zendesk ticket"""
    subject: Property[str] | None = None
    description: str | None = None
    priority: Property[Priority] | None = None
    ticket_type: Property[Type] | None = None
    assignee_id: Property[int] | None = None
    tags: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Create:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        url: str | None = None
        id: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    url: str | None = None
    id: int | None = None
