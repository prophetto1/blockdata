from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\sla\SLAMonitor.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.has_u_i_d import HasUID


@dataclass(slots=True, kw_only=True)
class SLAMonitor:
    execution_id: str | None = None
    sla_id: str | None = None
    deadline: datetime | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
