from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.models.discover_stream import DiscoverStream
from integrations.singer.models.discover_streams import DiscoverStreams
from integrations.singer.models.streams_configuration import StreamsConfiguration


@dataclass(slots=True, kw_only=True)
class SelectedService:

    def fill(self, discover_streams: DiscoverStreams, stream_configs: list[StreamsConfiguration]) -> DiscoverStreams:
        raise NotImplementedError  # TODO: translate from Java

    def match_properties(self, metadata: DiscoverStream, properties_pattern: list[String]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def select_stream(self, discover_stream: DiscoverStream, streams_configuration: StreamsConfiguration) -> DiscoverStream:
        raise NotImplementedError  # TODO: translate from Java
