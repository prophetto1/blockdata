from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\SyncNamespaceFiles.java
# WARNING: Unresolved types: IOException, InputStream, URISyntaxException

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from integrations.git.abstract_sync_task import AbstractSyncTask
from engine.core.storages.namespace import Namespace
from engine.core.storages.namespace_file import NamespaceFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SyncNamespaceFiles(AbstractSyncTask):
    """Sync Namespace Files from Git"""
    branch: Property[str] = Property.ofValue("main")
    namespace: Property[str] = Property.ofExpression("{{ flow.namespace }}")
    git_directory: Property[str] = Property.ofValue("_files")
    delete: Property[bool] = Property.ofValue(false)

    def fetched_namespace(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_resource(self, run_context: RunContext, rendered_namespace: str, namespace_file: NamespaceFile) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def simulate_resource_write(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    def write_resource(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, namespace: Namespace, path: Path, input_stream: InputStream) -> NamespaceFile:
        raise NotImplementedError  # TODO: translate from Java

    def has_same_content(self, namespace: Namespace, path: Path, source_file: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_same_content(self, namespace: Namespace, path: Path, source_content: InputStream) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def streams_equal(self, first: InputStream, second: InputStream) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def find_existing_resource(self, namespace: Namespace, rendered_namespace: str, uri: str) -> Optional[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def wrapper(self, run_context: RunContext, rendered_git_directory: str, rendered_namespace: str, resource_uri: str, resource_before_update: NamespaceFile, resource_after_update: NamespaceFile) -> SyncResult:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_resources(self, run_context: RunContext, rendered_namespace: str) -> list[NamespaceFile]:
        raise NotImplementedError  # TODO: translate from Java

    def to_uri(self, rendered_namespace: str, resource: NamespaceFile) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, diff_file_storage_uri: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(Output):
        files: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SyncResult(SyncResult):
        kestra_path: str | None = None
