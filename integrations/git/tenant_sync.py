from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\TenantSync.java
# WARNING: Unresolved types: ApiException, DiffLine, Exception, FilesApi, IOException, KestraClient, PersonIdent, Runnable, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, ClassVar

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TenantSync(AbstractKestraTask):
    """Sync an entire tenant with Git"""
    branch: Property[str]
    source_of_truth: Property[SourceOfTruth] = Property.ofValue(SourceOfTruth.KESTRA)
    when_missing_in_source: Property[WhenMissingInSource] = Property.ofValue(WhenMissingInSource.DELETE)
    protected_namespaces: Property[list[str]] = Property.ofValue(List.of("system"))
    dry_run: Property[bool] = Property.ofValue(false)
    on_invalid_syntax: Property[OnInvalidSyntax] = Property.ofValue(OnInvalidSyntax.FAIL)
    f_l_o_w_s__d_i_r: ClassVar[str] = "flows"
    f_i_l_e_s__d_i_r: ClassVar[str] = "files"
    d_a_s_h_b_o_a_r_d_s__d_i_r: ClassVar[str] = "_global/dashboards"
    git_directory: Property[str] | None = None
    commit_message: Property[str] | None = None
    author_email: Property[str] | None = None
    author_name: Property[str] | None = None
    clone_submodules: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def plan_namespace(self, run_context: RunContext, kestra_client: KestraClient, base_dir: Path, namespace: str, r_source_of_truth: SourceOfTruth, r_when_missing_in_source: WhenMissingInSource, r_on_invalid_syntax: OnInvalidSyntax, r_protected_namespaces: list[str], r_dry_run: bool, diffs: list[DiffLine], apply: list[Runnable], kestra_flows: list[FlowWithSource], kestra_files: dict[str, list[int]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list_namespace_files(self, kestra_client: KestraClient, run_context: RunContext, namespace: str) -> dict[str, list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def collect_files_recursive(self, files_api: FilesApi, tenant_id: str, namespace: str, current_path: str, files_out: dict[str, list[int]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def normalize_namespace_path(self, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def plan_flows(self, kestra_client: KestraClient, run_context: RunContext, flows_dir: Path, git_flows: dict[str, str], kestra_flows: list[FlowWithSource], namespace: str, r_source_of_truth: SourceOfTruth, r_when_missing_in_source: WhenMissingInSource, r_on_invalid_syntax: OnInvalidSyntax, r_protected_namespaces: list[str], r_dry_run: bool, diffs: list[DiffLine], apply: list[Runnable]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def plan_namespace_files(self, run_context: RunContext, kestra_client: KestraClient, files_dir: Path, git_files: dict[str, list[int]], kestra_files: dict[str, list[int]], namespace: str, r_source_of_truth: SourceOfTruth, r_when_missing_in_source: WhenMissingInSource, r_protected_namespaces: list[str], r_dry_run: bool, diffs: list[DiffLine], apply: list[Runnable]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def plan_dashboards(self, run_context: RunContext, kestra_client: KestraClient, base_dir: Path, r_source_of_truth: SourceOfTruth, r_when_missing_in_source: WhenMissingInSource, r_on_invalid_syntax: OnInvalidSyntax, r_dry_run: bool, diffs: list[DiffLine], apply: list[Runnable]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_flows_from_kestra(self, kestra_client: KestraClient, run_context: RunContext, namespace: str, r_on_invalid_syntax: OnInvalidSyntax) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_dashboards_from_kestra(self, kestra_client: KestraClient, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def read_git_dashboards(self, dashboards_dir: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def read_git_flows(self, flows_dir: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def read_git_files(self, files_dir: Path) -> dict[str, list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def write_git_file(self, path: Path, content: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_git_binary_file(self, path: Path, content: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_git_file(self, path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_namespace_file(self, kestra_client: KestraClient, run_context: RunContext, rel: str, bytes: list[int], namespace: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_namespace_file(self, kestra_client: KestraClient, run_context: RunContext, rel: str, namespace: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_protected(namespace: str, protected_namespace: list[str]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def normalize_yaml(yaml: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def handle_invalid(self, run_context: RunContext, mode: OnInvalidSyntax, what: str, e: Exception) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_named_temp_file(self, file_name: str, yaml: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def author(self, run_context: RunContext) -> PersonIdent:
        raise NotImplementedError  # TODO: translate from Java

    def discover_git_namespaces(self, base_dir: Path) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_commit_message(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    class SourceOfTruth(str, Enum):
        GIT = "GIT"
        KESTRA = "KESTRA"

    class WhenMissingInSource(str, Enum):
        DELETE = "DELETE"
        KEEP = "KEEP"
        FAIL = "FAIL"

    class OnInvalidSyntax(str, Enum):
        SKIP = "SKIP"
        WARN = "WARN"
        FAIL = "FAIL"

    @dataclass(slots=True)
    class Output:
        diff: str | None = None
        commit_id: str | None = None
        commit_u_r_l: str | None = None
