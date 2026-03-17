from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\namespaces\kv\KvCommand.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.namespaces.kv.kv_update_command import KvUpdateCommand


@dataclass(slots=True, kw_only=True)
class KvCommand(AbstractCommand):
    logger: ClassVar[Logger] = getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
