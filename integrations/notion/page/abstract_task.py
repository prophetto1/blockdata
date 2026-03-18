from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notion\src\main\java\io\kestra\plugin\notion\page\AbstractTask.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, notion, plugin, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.notion.notion_connection import NotionConnection
from integrations.notion.notion_response import NotionResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, NotionConnection):
    page_id: Property[str]

    def extract_page_title(self, properties: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, response: io.kestra.plugin.notion.NotionResponse, content: str, message: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_u_u_i_d(s: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format_as_u_u_i_d(hex_string: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def validate_and_render_page_id(self, run_context: RunContext) -> str:
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
