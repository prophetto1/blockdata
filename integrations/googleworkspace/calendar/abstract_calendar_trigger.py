from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.googleworkspace.gcp_interface import GcpInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCalendarTrigger(AbstractTrigger, GcpInterface):
    a_p_p_l_i_c_a_t_i_o_n__n_a_m_e: str | None = None
    service_account: Property[str] | None = None

    def connection(self, run_context: RunContext) -> Calendar:
        raise NotImplementedError  # TODO: translate from Java
