from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\List.java
# WARNING: Unresolved types: Drive, Exception, Files, IOException, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from integrations.googleworkspace.drive.abstract_drive import AbstractDrive
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractDrive):
    """List Drive files with a query"""
    query: Property[str] | None = None
    corpora: Property[java.util.List[Corpora]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, list: Drive.Files.List) -> java.util.List[Path]:
        raise NotImplementedError  # TODO: translate from Java

    class Corpora(str, Enum):
        user = "user"
        domain = "domain"
        teamDrive = "teamDrive"
        allTeamDrives = "allTeamDrives"

    @dataclass(slots=True)
    class Output:
        files: java.util.List[Path] | None = None
