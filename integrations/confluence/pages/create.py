from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-confluence\src\main\java\io\kestra\plugin\confluence\pages\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.confluence.abstract_confluence_task import AbstractConfluenceTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractConfluenceTask):
    """Create Confluence page from Markdown"""
    space_id: Property[str]
    embedded: Property[bool] | None = None
    make_private: Property[bool] | None = None
    root_level: Property[bool] | None = None
    status: Property[str] | None = None
    title: Property[str] | None = None
    parent_id: Property[str] | None = None
    markdown: Property[str] | None = None
    subtype: Property[str] | None = None

    def run(self, run_context: RunContext) -> Create.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        value: str | None = None
