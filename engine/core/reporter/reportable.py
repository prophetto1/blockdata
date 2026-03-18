from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\Reportable.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from engine.core.models.flows.type import Type


class Reportable(Protocol):
    def type(self) -> Type: ...

    def schedule(self) -> ReportingSchedule: ...

    def report(self, now: datetime, interval: TimeInterval | None = None, tenant: str | None = None) -> T: ...

    def is_enabled(self) -> bool: ...

    def is_tenant_supported(self) -> bool: ...
