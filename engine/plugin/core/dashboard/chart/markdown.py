from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\Markdown.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.charts.chart import Chart
from engine.core.models.dashboards.chart_option import ChartOption
from engine.plugin.core.dashboard.chart.mardown.sources.markdown_source import MarkdownSource


@dataclass(slots=True, kw_only=True)
class Markdown(Chart):
    """Add context and insights with customizable Markdown text."""
    content: str | None = None
    source: MarkdownSource | None = None
