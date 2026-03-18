from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\reports\FeatureUsageReport.java
# WARNING: Unresolved types: TimeInterval

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.reporter.abstract_reportable import AbstractReportable
from engine.core.reporter.model.count import Count
from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.webserver.models.events.event import Event
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.models.collectors.execution_usage import ExecutionUsage
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.collectors.flow_usage import FlowUsage


@dataclass(slots=True, kw_only=True)
class FeatureUsageReport(AbstractReportable):
    flow_repository: FlowRepositoryInterface | None = None
    execution_repository: ExecutionRepositoryInterface | None = None
    dashboard_repository: DashboardRepositoryInterface | None = None
    enabled: bool | None = None

    def report(self, now: datetime, interval: TimeInterval, tenant: str | None = None) -> UsageEvent:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class UsageEvent:
        executions: ExecutionUsage | None = None
        flows: FlowUsage | None = None
        dashboards: Count | None = None
