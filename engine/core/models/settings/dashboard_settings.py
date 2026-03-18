from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\settings\DashboardSettings.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class DashboardSettings:
    default_home_dashboard: str | None = None
    default_flow_overview_dashboard: str | None = None
    default_namespace_overview_dashboard: str | None = None
