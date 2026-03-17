from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\AbstractJdbcSLAMonitorStorage.java
# WARNING: Unresolved types: Consumer, io, jdbc, kestra

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.flows.sla.s_l_a_monitor import SLAMonitor
from engine.core.models.flows.sla.s_l_a_monitor_storage import SLAMonitorStorage


@dataclass(slots=True, kw_only=True)
class AbstractJdbcSLAMonitorStorage(AbstractJdbcRepository):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[SLAMonitor] | None = None

    def save(self, sla_monitor: SLAMonitor) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, execution_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_expired(self, date: datetime, consumer: Consumer[SLAMonitor]) -> None:
        raise NotImplementedError  # TODO: translate from Java
