from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\companies\Create.java
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
    """Create HubSpot company record"""
    name: Property[str]
    domain: Property[str]
    h_u_b_s_p_o_t__o_b_j_e_c_t__e_n_d_p_o_i_n_t: ClassVar[str] = "/crm/v3/objects/companies"
    company_description: Property[str] | None = None
    industry: Property[str] | None = None
    company_type: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
