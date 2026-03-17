from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataproc\clusters\Delete.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.compress.abstract_task import AbstractTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractTask):
    """Delete a Dataproc cluster"""
    cluster_name: str
    region: str
    d_a_t_a_p_r_o_c__g_o_o_g_l_e_a_p_i_s: ClassVar[str] = "-dataproc.googleapis.com:443"

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        cluster_name: str | None = None
        deleted: bool | None = None
