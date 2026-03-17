from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.models.discover_stream import DiscoverStream


@dataclass(slots=True, kw_only=True)
class DiscoverStreams:
    streams: list[DiscoverStream] | None = None
