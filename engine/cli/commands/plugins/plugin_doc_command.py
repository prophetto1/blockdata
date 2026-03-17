from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\plugins\PluginDocCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class PluginDocCommand(AbstractCommand):
    output: Path
    core: bool = False
    icons: bool = False
    schema: bool = False
    skip_deprecated: bool = False
    application_context: ApplicationContext | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def is_plugin_manager_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
