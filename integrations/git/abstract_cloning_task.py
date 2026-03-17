from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.git.abstract_git_task import AbstractGitTask
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractCloningTask(AbstractGitTask):
    clone_submodules: Property[bool] | None = None

    def checkout_commit(self, git: Git, sha: str, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def checkout_tag(self, git: Git, r_tag_name: str, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def checkout_branch(self, git: Git, branch: str, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java
