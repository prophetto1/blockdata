from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ActorRunStats:
    input_body_len: float | None = None
    restart_count: float | None = None
    resurrect_count: float | None = None
    mem_avg_bytes: float | None = None
    mem_max_bytes: float | None = None
    mem_current_bytes: float | None = None
    cpu_avg_usage: float | None = None
    cpu_max_usage: float | None = None
    cpu_current_usage: float | None = None
    net_rx_bytes: float | None = None
    net_tx_bytes: float | None = None
    duration_millis: float | None = None
    run_time_secs: float | None = None
    metamorph: float | None = None
    compute_units: float | None = None
