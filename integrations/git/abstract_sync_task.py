from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\AbstractSyncTask.java
# WARNING: Unresolved types: Exception, IOException, InputStream, O, Supplier, T, URISyntaxException, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class AbstractSyncTask(ABC, AbstractCloningTask):
    dry_run: Property[bool] = Property.ofValue(false)
    fail_on_missing_directory: Property[bool] = Property.ofValue(true)

    @abstractmethod
    def get_delete(self) -> Property[bool]:
        ...

    @abstractmethod
    def get_git_directory(self) -> Property[str]:
        ...

    @abstractmethod
    def fetched_namespace(self) -> Property[str]:
        ...

    def create_git_directory(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def git_resources_content_by_uri(self, base_directory: Path, run_context: RunContext) -> dict[str, Supplier[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def traverse_directories(self) -> Property[bool]:
        raise NotImplementedError  # TODO: translate from Java

    def must_keep(self, run_context: RunContext, instance_resource: T) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def delete_resource(self, run_context: RunContext, rendered_namespace: str, instance_resource: T) -> None:
        ...

    @abstractmethod
    def simulate_resource_write(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> T:
        ...

    @abstractmethod
    def write_resource(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> T:
        ...

    @abstractmethod
    def wrapper(self, run_context: RunContext, rendered_git_directory: str, rendered_namespace: str, resource_uri: str, resource_before_update: T, resource_after_update: T) -> SyncResult:
        ...

    def create_diff_file(self, run_context: RunContext, rendered_namespace: str, git_uri_by_resource_uri: dict[str, str], before_update_resources_by_uri: dict[str, T], after_update_resources_by_uri: dict[str, T], deleted_resources: list[T]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> O:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def fetch_resources(self, run_context: RunContext, rendered_namespace: str) -> list[T]:
        ...

    @abstractmethod
    def to_uri(self, rendered_namespace: str, resource: T) -> str:
        ...

    @abstractmethod
    def output(self, diff_file_storage_uri: str) -> O:
        ...

    @dataclass(slots=True)
    class Output(ABC):

        @abstractmethod
        def diff_file_uri(self) -> str:
            ...

    @dataclass(slots=True)
    class SyncResult(ABC):
        git_path: str | None = None
        sync_state: SyncState | None = None

    class SyncState(str, Enum):
        ADDED = "ADDED"
        DELETED = "DELETED"
        OVERWRITTEN = "OVERWRITTEN"
        UPDATED = "UPDATED"
        UNCHANGED = "UNCHANGED"
