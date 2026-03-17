from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from integrations.notion.notion_response import NotionResponse
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Update(AbstractTask):
    """Update a Notion page"""
    title: Property[str] | None = None
    content: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def update_page_title(self, run_context: RunContext, page_id: str, new_title: str) -> NotionResponse:
        raise NotImplementedError  # TODO: translate from Java

    def append_page_content(self, run_context: RunContext, page_id: str, new_content: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def add_blocks_to_page(self, run_context: RunContext, page_id: str, blocks: ArrayNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
