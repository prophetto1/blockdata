from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractTask, RunnableTask):
    """Delete a Dataproc cluster"""
    d_a_t_a_p_r_o_c__g_o_o_g_l_e_a_p_i_s: str | None = None
    cluster_name: str | None = None
    region: str | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        cluster_name: str | None = None
        deleted: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    cluster_name: str | None = None
    deleted: bool | None = None
