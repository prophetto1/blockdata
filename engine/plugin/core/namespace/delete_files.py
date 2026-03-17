from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\namespace\DeleteFiles.java
# WARNING: Unresolved types: Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.storages.namespace import Namespace
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class DeleteFiles(Task):
    """Delete files from Namespace storage."""
    namespace: Property[str]
    files: Any
    delete_parent_folder: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def delete_empty_folders(self, namespace: Namespace, folders: set[str], logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def track_parent_folder(self, file: NamespaceFile, parent_folders: set[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: dict[str, str] | None = None
