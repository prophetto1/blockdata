from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.git.abstract_git_task import AbstractGitTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SyncFlow(AbstractGitTask, RunnableTask):
    """Sync a single flow from Git"""
    n_a_m_e_s_p_a_c_e__f_i_n_d_e_r__p_a_t_t_e_r_n: Pattern | None = None
    branch: Property[str] | None = None
    target_namespace: Property[str]
    flow_path: Property[str]
    dry_run: Property[bool] | None = None

    def get_branch(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        flow_id: str | None = None
        namespace: str | None = None
        revision: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    flow_id: str | None = None
    namespace: str | None = None
    revision: int | None = None
