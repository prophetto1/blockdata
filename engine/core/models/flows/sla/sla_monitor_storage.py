from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\sla\SLAMonitorStorage.java
# WARNING: Unresolved types: Consumer

from datetime import datetime
from typing import Any, Protocol

from engine.core.models.flows.sla.sla_monitor import SLAMonitor


class SLAMonitorStorage(Protocol):
    def save(self, sla_monitor: SLAMonitor) -> None: ...

    def purge(self, execution_id: str) -> None: ...

    def process_expired(self, now: datetime, consumer: Consumer[SLAMonitor]) -> None: ...
