from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.pipedrive.abstract_pipedrive_task import AbstractPipedriveTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractPipedriveTask, RunnableTask):
    """Create a new person in Pipedrive CRM"""
    name: Property[str]
    org_id: Property[int] | None = None
    owner_id: Property[int] | None = None
    emails: Property[list[Map[String, Object]]] | None = None
    phones: Property[list[Map[String, Object]]] | None = None
    visible_to: Property[str] | None = None
    custom_fields: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        person_id: int | None = None
        add_time: str | None = None
        update_time: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    person_id: int | None = None
    add_time: str | None = None
    update_time: str | None = None
