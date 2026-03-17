from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class QueryService:
    m_a_p_p_e_r: ObjectMapper | None = None

    def request(self, run_context: RunContext, request: Any) -> SearchRequest:
        raise NotImplementedError  # TODO: translate from Java

    def parse_query(self, query: str) -> SearchRequest:
        raise NotImplementedError  # TODO: translate from Java
