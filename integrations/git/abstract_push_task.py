from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\AbstractPushTask.java
# WARNING: Unresolved types: CanonicalTreeParser, DiffEntry, Exception, Git, GitAPIException, IOException, InputStream, O, ObjectMapper, PathMatcher, PersonIdent, RemoteRefUpdate, Supplier, TypeReference, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from integrations.git.abstract_cloning_task import AbstractCloningTask
from integrations.git.services.git_service import GitService
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.utils.kestra_ignore import KestraIgnore
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.argocd.apps.status import Status


@dataclass(slots=True, kw_only=True)
class AbstractPushTask(ABC, AbstractCloningTask):
    r_e_j_e_c_t_i_o_n__s_t_a_t_u_s: ClassVar[list[RemoteRefUpdate.Status]] = Arrays.asList(
        REJECTED_NONFASTFORWARD,
        REJECTED_NODELETE,
        REJECTED_REMOTE_CHANGED,
        REJECTED_OTHER_REASON
    )
    t_y_p_e__r_e_f_e_r_e_n_c_e: ClassVar[TypeReference[list[str]]] = new TypeReference<>() {}
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    dry_run: Property[bool] = Property.ofValue(false)
    delete: Property[bool] = Property.ofValue(true)
    commit_message: Property[str] | None = None
    author_email: Property[str] | None = None
    author_name: Property[str] | None = None

    @abstractmethod
    def get_commit_message(self) -> Property[str]:
        ...

    @abstractmethod
    def get_git_directory(self) -> Property[str]:
        ...

    @abstractmethod
    def globs(self) -> Any:
        ...

    @abstractmethod
    def fetched_namespace(self) -> Property[str]:
        ...

    def create_git_directory(self, run_context: RunContext) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def instance_resources_content_by_path(self, run_context: RunContext, base_directory: Path, globs: list[str]) -> dict[Path, Supplier[InputStream]]:
        ...

    def delete_outdated_resources(self, git: Git, base_path: Path, content_by_path: dict[Path, Supplier[InputStream]], globs: list[str], kestra_ignore: KestraIgnore) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_unix(path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_stem(filename: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def matches_any(matchers: list[PathMatcher]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def write_resource_files(self, content_by_path: dict[Path, Supplier[InputStream]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_resource_file(self, path: Path, input_stream: InputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_diff_file(self, run_context: RunContext, git: Git) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def tree_iterator(git: Git, ref: str) -> CanonicalTreeParser:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_path(diff_entry: DiffEntry) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def push(self, git: Git, run_context: RunContext, git_service: GitService) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def author(self, run_context: RunContext) -> PersonIdent:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> O:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def output(self, push_output: Output, diff_file_storage_uri: str) -> O:
        ...

    @dataclass(slots=True)
    class Output:
        commit_id: str | None = None
        commit_u_r_l: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
