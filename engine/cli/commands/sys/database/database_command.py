from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\sys\database\DatabaseCommand.java

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.sys.database.database_migrate_command import DatabaseMigrateCommand


@dataclass(slots=True, kw_only=True)
class DatabaseCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
