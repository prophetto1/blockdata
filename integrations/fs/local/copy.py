from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\local\Copy.java
# WARNING: Unresolved types: Exception, IOException

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.fs.local.abstract_local_task import AbstractLocalTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Copy(AbstractLocalTask):
    """Copy files on the local filesystem"""
    from: Property[str]
    to: Property[str]
    overwrite: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def copy_file(self, source: Path, target: Path, overwrite: bool, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def copy_directory(self, source_dir: Path, target_dir: Path, overwrite: bool, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
