from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.abstract_update_task import AbstractUpdateTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractUpdateTask, RunnableTask):
    """Update HubSpot deal properties"""
    h_u_b_s_p_o_t__d_e_a_l__e_n_d_p_o_i_n_t: str | None = None
    deal_id: Property[str]
    name: Property[str] | None = None
    pipeline: Property[str] | None = None
    stage: Property[str] | None = None
    amount: Property[float] | None = None
    close_date: Property[str] | None = None
    deal_type: Property[str] | None = None
    associated_company_ids: Property[list[Long]] | None = None
    associated_contact_ids: Property[list[Long]] | None = None
    additional_properties: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
