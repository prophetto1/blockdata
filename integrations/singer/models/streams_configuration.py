from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.models.discover_metadata import DiscoverMetadata


@dataclass(slots=True, kw_only=True)
class StreamsConfiguration:
    stream: str | None = None
    replication_method: DiscoverMetadata | None = None
    replication_keys: str | None = None
    properties_pattern: list[String] | None = None
    selected: bool = True
