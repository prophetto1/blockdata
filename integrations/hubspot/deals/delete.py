from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.abstract_delete_task import AbstractDeleteTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractDeleteTask, RunnableTask):
    """Delete HubSpot deal by ID"""
    h_u_b_s_p_o_t__o_b_j_e_c_t__e_n_d_p_o_i_n_t: str | None = None
    deal_id: Property[str]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
