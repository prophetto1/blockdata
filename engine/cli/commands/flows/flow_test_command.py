from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowTestCommand.java
# WARNING: Unresolved types: ApplicationContext, CommandLine, CommandSpec, Exception, Model, SecureRandom

from dataclasses import dataclass, field
from logging import logging
from pathlib import Path
from typing import Any, ClassVar

from engine.cli.abstract_api_command import AbstractApiCommand


@dataclass(slots=True, kw_only=True)
class FlowTestCommand(AbstractApiCommand):
    random: ClassVar[SecureRandom]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    inputs: list[str] = field(default_factory=list)
    application_context: ApplicationContext | None = None
    file: Path | None = None
    spec: CommandLine.Model.CommandSpec | None = None

    @staticmethod
    def properties_overrides() -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_temp_dir() -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
