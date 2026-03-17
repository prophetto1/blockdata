from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.git.abstract_push_task import AbstractPushTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PushExecutionFiles(AbstractPushTask):
    """Push execution files to Git"""
    branch: Property[str] | None = None
    git_directory: Property[str] | None = None
    files: Any | None = None
    files_map: Any | None = None
    error_on_missing: Property[bool] | None = None

    def get_commit_message(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def globs(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def fetched_namespace(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def instance_resources_content_by_path(self, run_context: RunContext, base_directory: Path, globs: list[String]) -> dict[Path, Supplier[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, push_output: AbstractPushTask, diff_file_storage_uri: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(AbstractPushTask):
        files: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(AbstractPushTask):
    files: str | None = None

    def diff_file_uri(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
