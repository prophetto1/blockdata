from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\namespace\DownloadFiles.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class DownloadFiles(Task):
    """Download files from Namespace storage."""
    namespace: Property[str]
    files: Any
    destination: Property[str]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: dict[str, str] | None = None
