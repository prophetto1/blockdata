from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\sys\database\DatabaseMigrateCommand.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class DatabaseMigrateCommand(AbstractCommand):
    logger: ClassVar[Logger] = getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
