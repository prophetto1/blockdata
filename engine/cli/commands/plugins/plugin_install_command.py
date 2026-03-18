from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\plugins\PluginInstallCommand.java
# WARNING: Unresolved types: CommandLine, CommandSpec, Model, Provider

from dataclasses import dataclass, field
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.core.plugins.maven_plugin_downloader import MavenPluginDownloader
from engine.core.plugins.plugin_catalog_service import PluginCatalogService
from engine.core.plugins.plugin_manager import PluginManager


@dataclass(slots=True, kw_only=True)
class PluginInstallCommand(AbstractCommand):
    locally: bool = True
    all: bool = False
    dependencies: list[str] = field(default_factory=list)
    repositories: list[str] | None = None
    spec: CommandLine.Model.CommandSpec | None = None
    maven_plugin_repository_provider: Provider[MavenPluginDownloader] | None = None
    plugin_catalog_service: Provider[PluginCatalogService] | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_manager(self) -> PluginManager:
        raise NotImplementedError  # TODO: translate from Java

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
