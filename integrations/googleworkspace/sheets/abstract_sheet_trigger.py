from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSheetTrigger(AbstractTrigger):
    a_p_p_l_i_c_a_t_i_o_n__n_a_m_e: str | None = None
    service_account: Property[str] | None = None
    scopes: Property[list[String]] | None = None

    def sheets_connection(self, run_context: RunContext) -> Sheets:
        raise NotImplementedError  # TODO: translate from Java

    def drive_connection(self, run_context: RunContext) -> Drive:
        raise NotImplementedError  # TODO: translate from Java
