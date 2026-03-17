from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\AbstractReportable.java
# WARNING: Unresolved types: ReportingSchedule

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.webserver.models.events.event import Event
from engine.core.reporter.reportable import Reportable
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AbstractReportable(ABC):
    type: Type | None = None
    schedule: ReportingSchedule | None = None
    is_tenant_supported: bool | None = None

    def is_tenant_supported(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def type(self) -> Type:
        raise NotImplementedError  # TODO: translate from Java

    def schedule(self) -> ReportingSchedule:
        raise NotImplementedError  # TODO: translate from Java
