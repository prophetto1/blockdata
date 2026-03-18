from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\TenantController.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.core.models.settings.dashboard_settings import DashboardSettings
from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class TenantController:
    logger: ClassVar[Logger] = getLogger(__name__)
    oss_dashboard_settings: ClassVar[str] = "kestra.oss.dashboard-settings"
    tenant_service: TenantService | None = None
    dashboard_repository: DashboardRepositoryInterface | None = None
    setting_repository: SettingRepositoryInterface | None = None

    @dataclass(slots=True)
    class SetTenantDefaultDashboardsRequest:
        default_home_dashboard: str | None = None
        default_flow_overview_dashboard: str | None = None
        default_namespace_overview_dashboard: str | None = None
