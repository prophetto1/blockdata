from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\mardown\sources\MarkdownSource.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.dashboard.chart.mardown.sources.flow_description import FlowDescription
from engine.plugin.core.dashboard.chart.mardown.sources.text import Text


@dataclass(slots=True, kw_only=True)
class MarkdownSource:
    type: str
