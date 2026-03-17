from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\configs\sys\ConfigCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.configs.sys.config_properties_command import ConfigPropertiesCommand


@dataclass(slots=True, kw_only=True)
class ConfigCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
