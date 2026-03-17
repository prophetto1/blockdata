from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowExpandCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.core.models.validations.model_validator import ModelValidator


@dataclass(slots=True, kw_only=True)
class FlowExpandCommand(AbstractCommand):
    file: Path | None = None
    model_validator: ModelValidator | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
