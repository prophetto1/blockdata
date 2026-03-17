from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\SchedulerCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.commands.servers.abstract_server_command import AbstractServerCommand


@dataclass(slots=True, kw_only=True)
class SchedulerCommand(AbstractServerCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    application_context: ApplicationContext | None = None

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
