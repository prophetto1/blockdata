from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2SLAMonitorStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_s_l_a_monitor_storage import AbstractJdbcSLAMonitorStorage
from engine.repository.h2.h2_repository import H2Repository
from engine.core.models.flows.sla.s_l_a_monitor import SLAMonitor


@dataclass(slots=True, kw_only=True)
class H2SLAMonitorStorage(AbstractJdbcSLAMonitorStorage):
    pass
