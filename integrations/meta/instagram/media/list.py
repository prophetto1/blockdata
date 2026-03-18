from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\instagram\media\List.java
# WARNING: Unresolved types: Exception, JsonNode, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.meta.instagram.abstract_instagram_task import AbstractInstagramTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.meta.instagram.enums.media_field import MediaField
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class List(AbstractInstagramTask):
    """List Instagram media items"""
    d_e_f_a_u_l_t__m_e_d_i_a__l_i_m_i_t: ClassVar[int] = 25
    limit: Property[int] = Property.ofValue(DEFAULT_MEDIA_LIMIT)
    fields: Property[java.util.List[MediaField]] = Property.ofValue(java.util.List.of(
        MediaField.ID,
        MediaField.MEDIA_TYPE,
        MediaField.MEDIA_URL,
        MediaField.PERMALINK,
        MediaField.THUMBNAIL_URL,
        MediaField.TIMESTAMP,
        MediaField.CAPTION))
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def convert_node_to_map(self, media_node: JsonNode) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: java.util.List[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
        size: int | None = None
