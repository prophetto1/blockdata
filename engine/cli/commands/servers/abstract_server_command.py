from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\servers\AbstractServerCommand.java

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.servers.server_command_interface import ServerCommandInterface


@dataclass(slots=True, kw_only=True)
class AbstractServerCommand(ABC, AbstractCommand):
    logger: ClassVar[Logger] = getLogger(__name__)
    server_port: int | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def max_memory_in_mb(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def default_worker_thread() -> int:
        raise NotImplementedError  # TODO: translate from Java
