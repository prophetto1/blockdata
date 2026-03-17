from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\DefaultStartupHook.java
# WARNING: Unresolved types: ApplicationContext

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.services.startup_hook_interface import StartupHookInterface


@dataclass(slots=True, kw_only=True)
class DefaultStartupHook:
    application_context: ApplicationContext | None = None

    def start(self, abstract_command: AbstractCommand) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def save_kestra_version(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
