from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\ActorRunOptions.java

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class ActorRunOptions:
    build: float | None = None
    timeout_secs: float | None = None
    memory_mbytes: float | None = None
    disk_mbytes: float | None = None
    max_total_charge_usd: float | None = None

    def get_max_total_charge_usd(self) -> Optional[float]:
        raise NotImplementedError  # TODO: translate from Java
