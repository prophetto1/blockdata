from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta


@dataclass(slots=True, kw_only=True)
class ThroughputThrottler:
    m_i_n__s_l_e_e_p__n_s: int | None = None
    m_a_x__d_u_r_a_t_i_o_n: timedelta | None = None
    start_time_ms: int | None = None
    sleep_interval: timedelta | None = None
    max_throughput: int | None = None
    sleep_deficit_ns: int | None = None
    should_wakeup: bool | None = None

    def should_throttle(self, total_sent: int, current_time_ms: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def throttle(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wakeup(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
