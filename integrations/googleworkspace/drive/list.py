from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.googleworkspace.drive.abstract_drive import AbstractDrive
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Corpora(str, Enum):
    user = "user"
    domain = "domain"
    teamDrive = "teamDrive"
    allTeamDrives = "allTeamDrives"


@dataclass(slots=True, kw_only=True)
class List(AbstractDrive, RunnableTask):
    """List Drive files with a query"""
    query: Property[str] | None = None
    corpora: Property[java] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, list: Drive) -> java:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None
