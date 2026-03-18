from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\NamespaceSync.java
# WARNING: Unresolved types: DiffLine, Exception, IOException, PersonIdent, Runnable, T, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, ClassVar

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.services.flow_service import FlowService
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class NamespaceSync(AbstractCloningTask):
    """Sync a namespace with Git"""
    branch: Property[str]
    namespace: Property[str]
    source_of_truth: Property[SourceOfTruth] = Property.ofValue(SourceOfTruth.KESTRA)
    when_missing_in_source: Property[WhenMissingInSource] = Property.ofValue(WhenMissingInSource.DELETE)
    protected_namespaces: Property[list[str]] = Property.ofValue(List.of("system"))
    dry_run: Property[bool] = Property.ofValue(false)
    on_invalid_syntax: Property[OnInvalidSyntax] = Property.ofValue(OnInvalidSyntax.FAIL)
    f_l_o_w_s__d_i_r: ClassVar[str] = "flows"
    f_i_l_e_s__d_i_r: ClassVar[str] = "files"
    git_directory: Property[str] | None = None
    commit_message: Property[str] | None = None
    author_email: Property[str] | None = None
    author_name: Property[str] | None = None

    def flow_service(self, rc: RunContext) -> FlowService:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def plan_flows(self, rc: RunContext, base_dir: Path, git_tree: GitTree, kes: KestraState, r_source: SourceOfTruth, r_missing: WhenMissingInSource, r_invalid: OnInvalidSyntax, protected_namespace: list[str], r_dry_run: bool, diff: list[DiffLine], apply: list[Runnable]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def plan_namespace_files(self, rc: RunContext, base_dir: Path, namespace: str, git_files: dict[str, list[int]], kestra_files: dict[str, list[int]], r_source: SourceOfTruth, r_missing: WhenMissingInSource, protected_namespace: list[str], r_dry_run: bool, diff: list[DiffLine], apply: list[Runnable]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load_kestra_state(self, rc: RunContext, root_namespace: str, r_on_invalid_syntax: OnInvalidSyntax) -> KestraState:
        raise NotImplementedError  # TODO: translate from Java

    def read_git_tree_namespace_first(self, base_dir: Path) -> GitTree:
        raise NotImplementedError  # TODO: translate from Java

    def read_git_namespace_files(self, base_dir: Path, namespace: str) -> dict[str, list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def list_namespace_files(self, run_context: RunContext, namespace: str) -> dict[str, list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def normalize_namespace_path(self, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def read_namespace_file_bytes(self, run_context: RunContext, uri: str) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def put_namespace_file(self, run_context: RunContext, namespace: str, rel: str, bytes: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_namespace_file(self, run_context: RunContext, namespace: str, file: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def filter_tree_by_namespace(self, src: GitTree, root_namespace: str) -> GitTree:
        raise NotImplementedError  # TODO: translate from Java

    def ensure_namespace_folders(self, base_dir: Path, namespace: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flow(self, rc: RunContext, flow: FlowWithSource) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_protected(namespace: str, protected_namespace: list[str]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def normalize_yaml(yaml: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def key(namespace: str, id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def namespace_from_key(key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def id_from_key(key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def strip_ext(name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def union(a: set[T], b: set[T]) -> set[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def file_rel_from_key(kind: str, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def node_to_yaml_path(kind: str, g: GitNode, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def write_git_file(self, base: Path, rel: str, content: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_git_binary_file(self, base: Path, rel: str, content: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_git_file(self, base: Path, rel: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_invalid(self, rc: RunContext, mode: OnInvalidSyntax, what: str, e: Exception) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def author(self, run_context: RunContext) -> PersonIdent:
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
    class GitNode:
        namespace: str | None = None
        id: str | None = None
        raw_yaml: str | None = None
        rel_path: str | None = None

    @dataclass(slots=True)
    class GitTree:
        nodes: dict[str, GitNode] = field(default_factory=dict)

    @dataclass(slots=True)
    class KestraState:
        flows: dict[str, FlowWithSource] | None = None

    @dataclass(slots=True)
    class Output:
        diff: str | None = None
        commit_id: str | None = None
        commit_u_r_l: str | None = None
