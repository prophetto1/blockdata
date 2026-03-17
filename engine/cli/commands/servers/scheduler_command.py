from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\SchedulerCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.commands.servers.abstract_server_command import AbstractServerCommand


@dataclass(slots=True, kw_only=True)
class SchedulerCommand(AbstractServerCommand):
    application_context: ApplicationContext | None = None

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
