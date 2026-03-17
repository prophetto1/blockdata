from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\Reportable.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from engine.core.models.flows.type import Type


class Reportable(Protocol):
    def type(self) -> Type: ...

    def schedule(self) -> ReportingSchedule: ...

    def report(self, now: datetime, interval: TimeInterval) -> T: ...

    def report(self, now: datetime) -> T: ...

    def is_enabled(self) -> bool: ...

    def report(self, now: datetime, interval: TimeInterval, tenant: str) -> T: ...

    def report(self, now: datetime, tenant: str) -> T: ...

    def is_tenant_supported(self) -> bool: ...
