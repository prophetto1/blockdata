from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\StreamsConfiguration.java
# WARNING: Unresolved types: ReplicationMethod

from dataclasses import dataclass
from typing import Any

from integrations.singer.models.discover_metadata import DiscoverMetadata


@dataclass(slots=True, kw_only=True)
class StreamsConfiguration:
    selected: bool = True
    stream: str | None = None
    replication_method: DiscoverMetadata.ReplicationMethod | None = None
    replication_keys: str | None = None
    properties_pattern: list[str] | None = None
