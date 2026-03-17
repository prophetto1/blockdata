from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LogService:
    m_a_p_p_e_r: ObjectMapper | None = None

    def parse(self, run_context: RunContext, line: str, has_warning: AtomicBoolean) -> None:
        raise NotImplementedError  # TODO: translate from Java
