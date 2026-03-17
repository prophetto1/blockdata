from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\reports\PluginUsageReport.java
# WARNING: Unresolved types: TimeInterval

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.reporter.abstract_reportable import AbstractReportable
from engine.webserver.models.events.event import Event
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.models.collectors.plugin_usage import PluginUsage


@dataclass(slots=True, kw_only=True)
class PluginUsageReport(AbstractReportable):
    plugin_registry: PluginRegistry | None = None
    enabled: bool | None = None

    def report(self, now: datetime, period: TimeInterval) -> PluginUsageEvent:
        raise NotImplementedError  # TODO: translate from Java

    def is_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginUsageEvent:
        plugins: list[PluginUsage] | None = None
