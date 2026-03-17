from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notion\src\main\java\io\kestra\plugin\notion\page\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.notion.notion_connection import NotionConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(NotionConnection):
    """Create a Notion page"""
    title: Property[str]
    content: Property[str] | None = None
    parent_page_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_create_page_request(self, title: str, content: str, parent_page_id: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        page_id: str | None = None
        url: str | None = None
        title: str | None = None
        content: str | None = None
        created_time: datetime | None = None
        last_edited_time: datetime | None = None
        archived: bool | None = None
        properties: dict[str, Any] | None = None
        message: str | None = None
