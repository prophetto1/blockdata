from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\namespace\PurgeFiles.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.namespace.files_purge_behavior import FilesPurgeBehavior
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.models.property.property import Property
from engine.plugin.core.purge.purge_task import PurgeTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class PurgeFiles(Task):
    """Purge Namespace files (and versions)."""
    behavior: Property[FilesPurgeBehavior] = Property.ofValue(Version.builder().keepAmount(1).build())
    include_child_namespaces: Property[bool] = Property.ofValue(true)
    file_pattern: Property[str] | None = None
    namespaces: Property[list[str]] | None = None
    namespace_pattern: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter_pattern(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def filter_target_extractor(self, item: NamespaceFile) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
