from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-confluence\src\main\java\io\kestra\plugin\confluence\pages\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.confluence.abstract_confluence_task import AbstractConfluenceTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractConfluenceTask):
    """Update Confluence page content"""
    page_id: Property[str]
    status: Property[str]
    title: Property[str]
    markdown: Property[str]
    version_info: Property[dict[str, Any]]
    space_id: Property[str] | None = None
    parent_id: Property[str] | None = None
    owner_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Update.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        value: str | None = None
