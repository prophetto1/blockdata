from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\plugins\PluginSearchCommand.java
# WARNING: Unresolved types: Exception, JsonNode, ObjectMapper, StringBuilder

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.core.http.client.http_client import HttpClient


@dataclass(slots=True, kw_only=True)
class PluginSearchCommand(AbstractCommand):
    mapper: ClassVar[ObjectMapper]
    space: ClassVar[str] = ' '
    http_client: HttpClient | None = None
    search_term: str | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_plugins(self) -> JsonNode:
        raise NotImplementedError  # TODO: translate from Java

    def find_plugins(self, root: JsonNode) -> list[PluginInfo]:
        raise NotImplementedError  # TODO: translate from Java

    def matches_search(self, plugin: JsonNode, term: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def print_results(self, plugins: list[PluginInfo]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def print_plugins_table(self, plugins: list[PluginInfo]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def print_row(self, name_pad: StringBuilder, title_pad: StringBuilder, group_pad: StringBuilder, name: str, title: str, group: str, version: str, max_name: int, max_title: int, max_group: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pad(self, sb: StringBuilder, str: str, length: int) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginInfo:
        name: str | None = None
        title: str | None = None
        group: str | None = None
        version: str | None = None
