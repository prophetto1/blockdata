from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\TenantController.java

from dataclasses import dataclass
from typing import Any

from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.core.models.settings.dashboard_settings import DashboardSettings
from engine.core.http.http_response import HttpResponse
from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class TenantController:
    o_s_s__d_a_s_h_b_o_a_r_d__s_e_t_t_i_n_g_s: str = "kestra.oss.dashboard-settings"
    tenant_service: TenantService | None = None
    dashboard_repository: DashboardRepositoryInterface | None = None
    setting_repository: SettingRepositoryInterface | None = None

    @dataclass(slots=True)
    class SetTenantDefaultDashboardsRequest:
        default_home_dashboard: str | None = None
        default_flow_overview_dashboard: str | None = None
        default_namespace_overview_dashboard: str | None = None
