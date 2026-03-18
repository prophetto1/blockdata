from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\DiscoverStreams.java

from dataclasses import dataclass
from typing import Any

from integrations.singer.models.discover_stream import DiscoverStream


@dataclass(slots=True, kw_only=True)
class DiscoverStreams:
    streams: list[DiscoverStream] | None = None
