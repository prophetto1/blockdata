from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\PushExecutionFiles.java
# WARNING: Unresolved types: Exception, InputStream, Supplier

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.git.abstract_push_task import AbstractPushTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PushExecutionFiles(AbstractPushTask):
    """Push execution files to Git"""
    branch: Property[str] = Property.ofValue("main")
    git_directory: Property[str] = Property.ofValue("_outputs")
    error_on_missing: Property[bool] = Property.ofValue(false)
    files: Any | None = None
    files_map: Any | None = None

    def get_commit_message(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def globs(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def fetched_namespace(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def instance_resources_content_by_path(self, run_context: RunContext, base_directory: Path, globs: list[str]) -> dict[Path, Supplier[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, push_output: AbstractPushTask.Output, diff_file_storage_uri: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(Output):
        files: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
