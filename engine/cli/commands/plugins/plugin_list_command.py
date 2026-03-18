from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\plugins\PluginListCommand.java
# WARNING: Unresolved types: CommandLine, CommandSpec, Model

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class PluginListCommand(AbstractCommand):
    core: bool = False
    spec: CommandLine.Model.CommandSpec | None = None
    application_context: ApplicationContext | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
