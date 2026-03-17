from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\ServerCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.servers.executor_command import ExecutorCommand
from engine.cli.commands.servers.indexer_command import IndexerCommand
from engine.cli.commands.servers.local_command import LocalCommand
from engine.cli.commands.servers.scheduler_command import SchedulerCommand
from engine.cli.commands.servers.stand_alone_command import StandAloneCommand
from engine.cli.commands.servers.web_server_command import WebServerCommand
from engine.cli.commands.servers.worker_command import WorkerCommand


@dataclass(slots=True, kw_only=True)
class ServerCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
