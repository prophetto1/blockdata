from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresSLAMonitorStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_sla_monitor_storage import AbstractJdbcSLAMonitorStorage
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.models.flows.sla.sla_monitor import SLAMonitor


@dataclass(slots=True, kw_only=True)
class PostgresSLAMonitorStorage(AbstractJdbcSLAMonitorStorage):
    pass
