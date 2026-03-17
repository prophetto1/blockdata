from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowDotCommand.java
# WARNING: Unresolved types: ApplicationContext, Exception

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_command import AbstractCommand


@dataclass(slots=True, kw_only=True)
class FlowDotCommand(AbstractCommand):
    application_context: ApplicationContext | None = None
    file: Path | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
