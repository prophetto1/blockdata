from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\DiscoverStream.java

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.models.discover_metadata import DiscoverMetadata


@dataclass(slots=True, kw_only=True)
class DiscoverStream:
    extra: dict[str, Any] = field(default_factory=dict)
    tap_stream_id: str | None = None
    stream: str | None = None
    schema: dict[str, Any] | None = None
    table_name: str | None = None
    key_properties: list[str] | None = None
    metadata: list[Metadata] | None = None

    def get_extra_fields(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Metadata:
        breadcrumb: list[str] = field(default_factory=list)
        metadata: DiscoverMetadata | None = None

        def breadcrumb(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
