from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\pool\PoolService.java
# WARNING: Unresolved types: BatchClient, CloudPool, IOException, InterruptedException, TimeoutException

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PoolService:

    @staticmethod
    def wait_for_ready(run_context: RunContext, client: BatchClient, pool: CloudPool) -> CloudPool:
        raise NotImplementedError  # TODO: translate from Java
