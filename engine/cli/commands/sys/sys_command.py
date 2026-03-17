from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\sys\SysCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.sys.database.database_command import DatabaseCommand
from engine.cli.commands.sys.reindex_command import ReindexCommand
from engine.cli.commands.sys.statestore.state_store_command import StateStoreCommand
from engine.cli.commands.sys.submit_queued_command import SubmitQueuedCommand


@dataclass(slots=True, kw_only=True)
class SysCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
