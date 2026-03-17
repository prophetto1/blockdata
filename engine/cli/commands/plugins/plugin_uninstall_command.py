from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\plugins\PluginUninstallCommand.java
# WARNING: Unresolved types: CommandLine, CommandSpec, Exception, Model, Provider

from dataclasses import dataclass, field
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.core.plugins.maven_plugin_downloader import MavenPluginDownloader


@dataclass(slots=True, kw_only=True)
class PluginUninstallCommand(AbstractCommand):
    dependencies: list[str] = field(default_factory=list)
    spec: CommandLine.Model.CommandSpec | None = None
    maven_plugin_repository_provider: Provider[MavenPluginDownloader] | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
