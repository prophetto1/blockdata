from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Entry:
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    event_bus_name: str
    source: str
    detail_type: str
    detail: Any | None = None
    resources: list[String] | None = None

    def to_request_entry(self, run_context: RunContext) -> PutEventsRequestEntry:
        raise NotImplementedError  # TODO: translate from Java

    def json_value(self, run_context: RunContext, event: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java
