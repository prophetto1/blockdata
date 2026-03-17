from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\dashboard\chart\tables\TableOption.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.chart_option import ChartOption


@dataclass(slots=True, kw_only=True)
class TableOption(ChartOption):
    header: HeaderOption = HeaderOption.builder().build()
    pagination: PaginationOption = PaginationOption.builder().build()

    @dataclass(slots=True)
    class HeaderOption:
        enabled: bool = True

    @dataclass(slots=True)
    class PaginationOption:
        enabled: bool = True
