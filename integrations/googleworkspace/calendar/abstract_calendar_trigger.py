from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\AbstractCalendarTrigger.java
# WARNING: Unresolved types: Calendar, Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.gcp.gcp_interface import GcpInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCalendarTrigger(ABC, AbstractTrigger):
    a_p_p_l_i_c_a_t_i_o_n__n_a_m_e: ClassVar[str] = "Kestra"
    service_account: Property[str] | None = None

    def connection(self, run_context: RunContext) -> Calendar:
        raise NotImplementedError  # TODO: translate from Java
