from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlSLAMonitorStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_s_l_a_monitor_storage import AbstractJdbcSLAMonitorStorage
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.flows.sla.s_l_a_monitor import SLAMonitor


@dataclass(slots=True, kw_only=True)
class MysqlSLAMonitorStorage(AbstractJdbcSLAMonitorStorage):
    pass
