from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\templates\TemplateValidateCommand.java

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_validate_command import AbstractValidateCommand
from engine.core.models.validations.model_validator import ModelValidator


@dataclass(slots=True, kw_only=True)
class TemplateValidateCommand(AbstractValidateCommand):
    model_validator: ModelValidator | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
