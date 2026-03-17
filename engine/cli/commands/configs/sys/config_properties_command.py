from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\configs\sys\ConfigPropertiesCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class ConfigPropertiesCommand(AbstractCommand):
    application_context: ApplicationContext | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
