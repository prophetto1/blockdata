from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\sla\Violation.java
# WARNING: Unresolved types: Behavior

from dataclasses import dataclass
from typing import Any

from engine.core.models.label import Label
from engine.core.models.flows.sla.sla import SLA


@dataclass(slots=True, kw_only=True)
class Violation:
    sla_id: str | None = None
    behavior: SLA.Behavior | None = None
    labels: list[Label] | None = None
    reason: str | None = None
