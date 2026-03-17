from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from pathlib import Path

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class SyncState(str, Enum):
    ADDED = "ADDED"
    DELETED = "DELETED"
    OVERWRITTEN = "OVERWRITTEN"
    UPDATED = "UPDATED"
    UNCHANGED = "UNCHANGED"


@dataclass(slots=True, kw_only=True)
class AbstractSyncTask(AbstractCloningTask, RunnableTask):
    dry_run: Property[bool] | None = None
    fail_on_missing_directory: Property[bool] | None = None

    def get_delete(self) -> Property[bool]:
        raise NotImplementedError  # TODO: translate from Java

    def get_git_directory(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def fetched_namespace(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def create_git_directory(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def git_resources_content_by_uri(self, base_directory: Path, run_context: RunContext) -> dict[URI, Supplier[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def traverse_directories(self) -> Property[bool]:
        raise NotImplementedError  # TODO: translate from Java

    def must_keep(self, run_context: RunContext, instance_resource: T) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def delete_resource(self, run_context: RunContext, rendered_namespace: str, instance_resource: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def simulate_resource_write(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def write_resource(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def wrapper(self, run_context: RunContext, rendered_git_directory: str, rendered_namespace: str, resource_uri: str, resource_before_update: T, resource_after_update: T) -> SyncResult:
        raise NotImplementedError  # TODO: translate from Java

    def create_diff_file(self, run_context: RunContext, rendered_namespace: str, git_uri_by_resource_uri: dict[URI, URI], before_update_resources_by_uri: dict[URI, T], after_update_resources_by_uri: dict[URI, T], deleted_resources: list[T]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> O:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_resources(self, run_context: RunContext, rendered_namespace: str) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    def to_uri(self, rendered_namespace: str, resource: T) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, diff_file_storage_uri: str) -> O:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SyncResult:
        git_path: str | None = None
        sync_state: SyncState | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):

    def diff_file_uri(self) -> str:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class SyncResult:
    git_path: str | None = None
    sync_state: SyncState | None = None
