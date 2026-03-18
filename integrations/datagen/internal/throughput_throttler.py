from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\internal\ThroughputThrottler.java

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ThroughputThrottler:
    m_i_n__s_l_e_e_p__n_s: ClassVar[int] = Duration.ofMillis(2).toNanos()
    m_a_x__d_u_r_a_t_i_o_n: ClassVar[timedelta] = Duration.ofMillis(Long.MAX_VALUE)
    sleep_deficit_ns: int = 0
    should_wakeup: bool = False
    start_time_ms: int | None = None
    sleep_interval: timedelta | None = None
    max_throughput: int | None = None

    def should_throttle(self, total_sent: int, current_time_ms: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def throttle(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wakeup(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
