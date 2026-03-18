from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\contacts\Delete.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.hubspot.abstract_delete_task import AbstractDeleteTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractDeleteTask):
    """Delete HubSpot contact by ID"""
    contact_id: Property[str]
    h_u_b_s_p_o_t__o_b_j_e_c_t__e_n_d_p_o_i_n_t: ClassVar[str] = "/crm/v3/objects/contacts"

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
