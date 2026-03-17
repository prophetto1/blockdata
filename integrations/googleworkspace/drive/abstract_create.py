from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\AbstractCreate.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.googleworkspace.drive.abstract_drive import AbstractDrive
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCreate(ABC, AbstractDrive):
    parents: Property[list[str]] | None = None
    name: Property[str] | None = None
    description: str | None = None
    mime_type: Property[str] | None = None
    team_drive_id: Property[str] | None = None

    def file(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java
