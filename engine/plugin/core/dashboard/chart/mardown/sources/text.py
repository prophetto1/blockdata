from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\mardown\sources\Text.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.dashboard.chart.mardown.sources.markdown_source import MarkdownSource


@dataclass(slots=True, kw_only=True)
class Text(MarkdownSource):
    """Markdown from text"""
    content: str | None = None
