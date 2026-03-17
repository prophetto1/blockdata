from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\reports\SystemInformationReport.java
# WARNING: Unresolved types: ApplicationContext, Environment, TimeInterval

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.reporter.abstract_reportable import AbstractReportable
from engine.core.models.collectors.configuration_usage import ConfigurationUsage
from engine.webserver.models.events.event import Event
from engine.core.models.collectors.host_usage import HostUsage


@dataclass(slots=True, kw_only=True)
class SystemInformationReport(AbstractReportable):
    environment: Environment | None = None
    application_context: ApplicationContext | None = None
    kestra_url: str | None = None
    start_time: datetime | None = None

    def report(self, now: datetime, time_interval: TimeInterval) -> SystemInformationEvent:
        raise NotImplementedError  # TODO: translate from Java

    def is_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SystemInformationEvent:
        environments: set[str] | None = None
        host: HostUsage | None = None
        configurations: ConfigurationUsage | None = None
        start_time: datetime | None = None
        uri: str | None = None
