from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PoolService:

    def wait_for_ready(self, run_context: RunContext, client: BatchClient, pool: CloudPool) -> CloudPool:
        raise NotImplementedError  # TODO: translate from Java
