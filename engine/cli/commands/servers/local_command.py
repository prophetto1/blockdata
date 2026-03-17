from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\LocalCommand.java

from dataclasses import dataclass
from typing import Any

from engine.cli.commands.servers.stand_alone_command import StandAloneCommand


@dataclass(slots=True, kw_only=True)
class LocalCommand(StandAloneCommand):
    application_context: ApplicationContext | None = None

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
