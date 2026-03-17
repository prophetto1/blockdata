from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.abstract_create_task import AbstractCreateTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCreateTask, RunnableTask):
    """Create HubSpot deal record"""
    h_u_b_s_p_o_t__d_e_a_l__e_n_d_p_o_i_n_t: str | None = None
    name: Property[str]
    pipeline: Property[str]
    stage: Property[str]
    amount: Property[float] | None = None
    close_date: Property[str] | None = None
    deal_type: Property[str] | None = None
    associated_company_ids: Property[list[Long]] | None = None
    associated_contact_ids: Property[list[Long]] | None = None
    additional_properties: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Create:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
