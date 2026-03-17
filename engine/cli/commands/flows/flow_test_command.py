from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowTestCommand.java
# WARNING: Unresolved types: ApplicationContext, CommandLine, CommandSpec, Exception, Model, SecureRandom

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.cli.abstract_api_command import AbstractApiCommand


@dataclass(slots=True, kw_only=True)
class FlowTestCommand(AbstractApiCommand):
    inputs: list[str] = field(default_factory=list)
    random: ClassVar[SecureRandom] = new SecureRandom()
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
