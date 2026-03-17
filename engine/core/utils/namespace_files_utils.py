from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\NamespaceFilesUtils.java
# WARNING: Unresolved types: Exception, LinkedBlockingQueue, ThreadFactoryBuilder, ThreadPoolExecutor

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.executor.executor_service import ExecutorService
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class NamespaceFilesUtils:
    max_threads: ClassVar[int]
    executor_service: ClassVar[ExecutorService]

    @staticmethod
    def load_namespace_files(run_context: RunContext, namespace_files: NamespaceFiles) -> None:
        raise NotImplementedError  # TODO: translate from Java
