from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\namespace\UploadFiles.java
# WARNING: Unresolved types: Conflicts, URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.storages.namespace import Namespace
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class UploadFiles(Task):
    """Upload files into a Namespace."""
    namespace: Property[str]
    destination: Property[str]
    conflict: Property[Namespace.Conflicts]
    files: Property[list[str]] | None = None
    files_map: Any | None = None

    def run(self, run_context: RunContext) -> UploadFiles.Output:
        raise NotImplementedError  # TODO: translate from Java

    def upload_files(self, run_context: RunContext, files: list[str], storage_namespace: Namespace, destination: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def upload_files_map(self, run_context: RunContext, files_map: dict[str, Any], storage_namespace: Namespace, destination: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: dict[str, str] | None = None
