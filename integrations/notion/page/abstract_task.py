from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.notion.notion_connection import NotionConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractTask(NotionConnection, RunnableTask):
    page_id: Property[str]

    def extract_page_title(self, properties: dict[String, Object]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, response: io, content: str, message: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def is_u_u_i_d(self, s: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def format_as_u_u_i_d(self, hex_string: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def validate_and_render_page_id(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        page_id: str | None = None
        url: str | None = None
        title: str | None = None
        content: str | None = None
        created_time: datetime | None = None
        last_edited_time: datetime | None = None
        archived: bool | None = None
        properties: dict[String, Object] | None = None
        message: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    page_id: str | None = None
    url: str | None = None
    title: str | None = None
    content: str | None = None
    created_time: datetime | None = None
    last_edited_time: datetime | None = None
    archived: bool | None = None
    properties: dict[String, Object] | None = None
    message: str | None = None
