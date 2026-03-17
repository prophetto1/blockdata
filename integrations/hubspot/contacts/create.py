from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.abstract_create_task import AbstractCreateTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCreateTask, RunnableTask):
    """Create HubSpot contact record"""
    h_u_b_s_p_o_t__c_o_n_t_a_c_t__e_n_d_p_o_i_n_t: str | None = None
    email: Property[str]
    first_name: Property[str] | None = None
    last_name: Property[str] | None = None
    phone: Property[str] | None = None
    job_title: Property[str] | None = None
    lifecycle_stage: Property[str] | None = None
    additional_properties: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
