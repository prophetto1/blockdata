from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\App.java
# WARNING: Unresolved types: CommandLine

from dataclasses import dataclass
from typing import Any

from engine.cli.commands.configs.sys.config_command import ConfigCommand
from engine.cli.commands.flows.flow_command import FlowCommand
from engine.cli.commands.migrations.migration_command import MigrationCommand
from engine.cli.commands.namespaces.namespace_command import NamespaceCommand
from engine.cli.commands.plugins.plugin_command import PluginCommand
from engine.cli.commands.servers.server_command import ServerCommand
from engine.cli.commands.sys.sys_command import SysCommand
from engine.cli.commands.templates.template_command import TemplateCommand
from engine.cli.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class App:

    @staticmethod
    def main(args: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def run_cli(cls: type[Any], args: list[str] | None = None) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execute(cls: type[Any], environments: list[str]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_command_line(cls: type[Any], args: list[str]) -> CommandLine:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def application_context(main_class: type[Any], command_line: CommandLine, environments: list[str] | None = None) -> ApplicationContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def continue_on_parsing_errors(cmd: CommandLine) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_properties_from_method(cls: type[Any], method_name: str, instance: Any) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_practical_command(command_line: CommandLine) -> bool:
        raise NotImplementedError  # TODO: translate from Java
