from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gitlab.abstract_git_lab_task import AbstractGitLabTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractGitLabTask, RunnableTask):
    """Open a project merge request"""
    title: Property[str]
    source_branch: Property[str]
    target_branch: Property[str]
    merge_request_description: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        merge_req_i_d: str | None = None
        web_url: str | None = None
        status_code: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    merge_req_i_d: str | None = None
    web_url: str | None = None
    status_code: int | None = None
