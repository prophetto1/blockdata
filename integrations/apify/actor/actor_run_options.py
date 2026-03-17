from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ActorRunOptions:
    build: float | None = None
    timeout_secs: float | None = None
    memory_mbytes: float | None = None
    disk_mbytes: float | None = None
    max_total_charge_usd: float | None = None

    def get_max_total_charge_usd(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java
