from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\reports\PluginMetricReport.java
# WARNING: Unresolved types: TimeInterval

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.reporter.abstract_reportable import AbstractReportable
from engine.webserver.models.events.event import Event
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.models.collectors.plugin_metric import PluginMetric
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.models.executions.metrics.timer import Timer


@dataclass(slots=True, kw_only=True)
class PluginMetricReport(AbstractReportable):
    plugin_registry: PluginRegistry | None = None
    metric_registry: MetricRegistry | None = None
    enabled: bool | None = None

    def report(self, now: datetime, period: TimeInterval) -> PluginMetricEvent:
        raise NotImplementedError  # TODO: translate from Java

    def is_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_metrics(self) -> list[PluginMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def task_metric(self, type: str) -> Optional[PluginMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_metric(self, type: str) -> Optional[PluginMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def from_timer(self, type: str, timer: Timer) -> Optional[PluginMetric]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginMetricEvent:
        plugin_metrics: list[PluginMetric] | None = None
