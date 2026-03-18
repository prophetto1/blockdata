from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-confluence\src\main\java\io\kestra\plugin\confluence\pages\List.java
# WARNING: Unresolved types: Exception, FlexmarkHtmlConverter, JsonNode, ObjectMapper, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.confluence.abstract_confluence_task import AbstractConfluenceTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractConfluenceTask):
    """List Confluence pages as Markdown"""
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    status: Property[java.util.List[str]] = Property.ofValue(Arrays.asList("current", "archived"))
    limit: Property[@Min(1) @Max(250) Integer] = Property.ofValue(25)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    page_ids: Property[java.util.@Size(max = 250) List[int]] | None = None
    space_ids: Property[java.util.@Size(max = 100) List[int]] | None = None
    sort: Property[str] | None = None
    title: Property[str] | None = None
    sub_type: Property[str] | None = None
    cursor: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def convert_page(self, page_info: JsonNode, body_format: str, converter: FlexmarkHtmlConverter) -> OutputChild:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        children: java.util.List[OutputChild] | None = None
        uri: str | None = None

    @dataclass(slots=True)
    class OutputChild:
        title: str | None = None
        markdown: str | None = None
        version_info: dict[str, Any] | None = None
        raw_response: dict[str, Any] | None = None
