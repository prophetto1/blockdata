from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\plugins\PluginCommand.java

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.plugins.plugin_doc_command import PluginDocCommand
from engine.cli.commands.plugins.plugin_install_command import PluginInstallCommand
from engine.cli.commands.plugins.plugin_list_command import PluginListCommand
from engine.cli.commands.plugins.plugin_search_command import PluginSearchCommand
from engine.cli.commands.plugins.plugin_uninstall_command import PluginUninstallCommand


@dataclass(slots=True, kw_only=True)
class PluginCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def load_external_plugins(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
