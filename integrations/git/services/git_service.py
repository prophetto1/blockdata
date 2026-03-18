from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\services\GitService.java
# WARNING: Unresolved types: Exception, Git, Pattern

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.git.abstract_git_task import AbstractGitTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GitService:
    s_s_h__u_r_l__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("git@(?:ssh\\.)?([^:]+):(?:v\\d*/)?(.*)")
    git_task: AbstractGitTask | None = None

    def clone_branch(self, run_context: RunContext, branch: str, with_submodules: Property[bool]) -> Git:
        raise NotImplementedError  # TODO: translate from Java

    def branch_exists(self, run_context: RunContext, branch: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_http_url(self, git_url: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def namespace_access_guard(self, run_context: RunContext, namespace_to_access: Property[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java
