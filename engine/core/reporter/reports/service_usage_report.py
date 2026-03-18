from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\reports\ServiceUsageReport.java
# WARNING: Unresolved types: TimeInterval

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.reporter.abstract_reportable import AbstractReportable
from engine.webserver.models.events.event import Event
from engine.core.repositories.service_instance_repository_interface import ServiceInstanceRepositoryInterface
from engine.core.models.collectors.service_usage import ServiceUsage


@dataclass(slots=True, kw_only=True)
class ServiceUsageReport(AbstractReportable):
    service_instance_repository: ServiceInstanceRepositoryInterface | None = None
    is_enabled: bool | None = None

    def report(self, now: datetime, period: TimeInterval) -> ServiceUsageEvent:
        raise NotImplementedError  # TODO: translate from Java

    def is_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ServiceUsageEvent:
        services: ServiceUsage | None = None
