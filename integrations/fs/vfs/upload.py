from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\Upload.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.fs.vfs.abstract_vfs_task import AbstractVfsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(ABC, AbstractVfsTask):
    from: Property[str]
    overwrite: Property[bool] = Property.ofValue(false)
    to: Property[str] | None = None

    def run(self, run_context: RunContext) -> Upload.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        from: str | None = None
        to: str | None = None
