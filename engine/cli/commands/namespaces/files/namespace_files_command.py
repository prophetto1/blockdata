from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\namespaces\files\NamespaceFilesCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.namespaces.files.namespace_files_update_command import NamespaceFilesUpdateCommand


@dataclass(slots=True, kw_only=True)
class NamespaceFilesCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
