from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\deals\Create.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.hubspot.abstract_create_task import AbstractCreateTask
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCreateTask):
    """Create HubSpot deal record"""
    name: Property[str]
    pipeline: Property[str]
    stage: Property[str]
    h_u_b_s_p_o_t__d_e_a_l__e_n_d_p_o_i_n_t: ClassVar[str] = "/crm/v3/objects/deals"
    amount: Property[float] | None = None
    close_date: Property[str] | None = None
    deal_type: Property[str] | None = None
    associated_company_ids: Property[list[int]] | None = None
    associated_contact_ids: Property[list[int]] | None = None
    additional_properties: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Create.Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
