from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\services\DataEmitterOptions.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class DataEmitterOptions:
    n_o__t_h_r_o_u_g_h_p_u_t: int = -1
    num_executions: int | None = None
    throughput: int | None = None
    reporting_interval: timedelta | None = None
