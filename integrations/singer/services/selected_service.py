from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\services\SelectedService.java

from dataclasses import dataclass
from typing import Any

from integrations.singer.models.discover_stream import DiscoverStream
from integrations.singer.models.discover_streams import DiscoverStreams
from integrations.kubernetes.models.metadata import Metadata
from integrations.singer.models.streams_configuration import StreamsConfiguration


@dataclass(slots=True, kw_only=True)
class SelectedService:

    @staticmethod
    def fill(discover_streams: DiscoverStreams, stream_configs: list[StreamsConfiguration]) -> DiscoverStreams:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def match_properties(metadata: DiscoverStream.Metadata, properties_pattern: list[str]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def select_stream(discover_stream: DiscoverStream, streams_configuration: StreamsConfiguration) -> DiscoverStream:
        raise NotImplementedError  # TODO: translate from Java
