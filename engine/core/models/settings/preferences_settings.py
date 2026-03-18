from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\settings\PreferencesSettings.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.settings.dashboard_settings import DashboardSettings


@dataclass(slots=True, kw_only=True)
class PreferencesSettings:
    dashboard: DashboardSettings | None = None
