from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\DashboardYamlBuilder.java

from typing import Any, Protocol


class DashboardYamlBuilder(Protocol):
    def build_dashboard(self, dashboard_schema: str, dashboard_generation_error: str, user_prompt: str) -> str: ...
