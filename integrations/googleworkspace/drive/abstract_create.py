from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.googleworkspace.drive.abstract_drive import AbstractDrive
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCreate(AbstractDrive):
    parents: Property[list[String]] | None = None
    name: Property[str] | None = None
    description: str | None = None
    mime_type: Property[str] | None = None
    team_drive_id: Property[str] | None = None

    def file(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java
