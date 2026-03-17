from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.models.discover_metadata import DiscoverMetadata


@dataclass(slots=True, kw_only=True)
class DiscoverStream:
    tap_stream_id: str | None = None
    stream: str | None = None
    schema: dict[String, Object] | None = None
    table_name: str | None = None
    key_properties: list[String] | None = None
    metadata: list[Metadata] | None = None
    extra: dict[String, Object] | None = None

    def get_extra_fields(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Metadata:
        metadata: DiscoverMetadata | None = None
        breadcrumb: list[String] | None = None

        def breadcrumb(self) -> str:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Metadata:
    metadata: DiscoverMetadata | None = None
    breadcrumb: list[String] | None = None

    def breadcrumb(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
