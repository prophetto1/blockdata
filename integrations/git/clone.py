from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Clone(AbstractCloningTask, RunnableTask):
    """Clone a Git repository"""
    directory: Property[str] | None = None
    branch: Property[str] | None = None
    depth: Property[int] | None = None
    commit: Property[str] | None = None
    tag: Property[str] | None = None

    def run(self, run_context: RunContext) -> Clone:
        raise NotImplementedError  # TODO: translate from Java

    def get_url(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        directory: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    directory: str | None = None
