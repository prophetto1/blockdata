from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\Uploads.java
# WARNING: Unresolved types: Exception, From, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.fs.vfs.abstract_vfs_task import AbstractVfsTask
from integrations.datagen.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Uploads(ABC, AbstractVfsTask):
    from: Any
    to: Property[str]
    max_files: Property[int] = Property.ofValue(25)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def parse_from_property(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: list[str] | None = None
