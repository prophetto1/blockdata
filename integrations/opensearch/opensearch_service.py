from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class OpensearchService:

    def to_body(self, run_context: RunContext, value: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java
