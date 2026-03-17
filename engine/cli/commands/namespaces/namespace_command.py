from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\namespaces\NamespaceCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.namespaces.kv.kv_command import KvCommand
from engine.cli.commands.namespaces.files.namespace_files_command import NamespaceFilesCommand


@dataclass(slots=True, kw_only=True)
class NamespaceCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
