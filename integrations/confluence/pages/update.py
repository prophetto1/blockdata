from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.confluence.abstract_confluence_task import AbstractConfluenceTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractConfluenceTask, RunnableTask):
    """Update Confluence page content"""
    page_id: Property[str]
    status: Property[str]
    title: Property[str]
    space_id: Property[str] | None = None
    parent_id: Property[str] | None = None
    owner_id: Property[str] | None = None
    markdown: Property[str]
    version_info: Property[dict[String, Object]]

    def run(self, run_context: RunContext) -> Update:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        value: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    value: str | None = None
