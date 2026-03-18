from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\tickets\Create.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.hubspot.abstract_create_task import AbstractCreateTask
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCreateTask):
    """Create HubSpot ticket record"""
    h_u_b_s_p_o_t__t_i_c_k_e_t__e_n_d_p_o_i_n_t: ClassVar[str] = "/crm/v3/objects/tickets"
    stage: Property[int] = Property.ofValue(1)
    subject: Property[str] | None = None
    content: Property[str] | None = None
    pipeline: Property[int] | None = None
    priority: Property[Priority] | None = None

    def run(self, run_context: RunContext) -> Create.Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class Priority(str, Enum):
        LOW = "LOW"
        MEDIUM = "MEDIUM"
        HIGH = "HIGH"
