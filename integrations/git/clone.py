from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\Clone.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Clone(AbstractCloningTask):
    """Clone a Git repository"""
    depth: Property[int] = Property.ofValue(1)
    directory: Property[str] | None = None
    branch: Property[str] | None = None
    commit: Property[str] | None = None
    tag: Property[str] | None = None

    def run(self, run_context: RunContext) -> Clone.Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_url(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        directory: str | None = None
