from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\DashboardController.java
# WARNING: Unresolved types: ConstraintViolationException, IOException, Pageable, Pattern, Void

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.dashboards.charts.chart import Chart
from engine.webserver.models.chart_filters_overrides import ChartFiltersOverrides
from engine.core.models.dashboards.dashboard import Dashboard
from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.core.models.settings.dashboard_settings import DashboardSettings
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.http.http_response import HttpResponse
from engine.core.models.validations.model_validator import ModelValidator
from engine.webserver.responses.paged_results import PagedResults
from engine.core.models.query_filter import QueryFilter
from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface
from engine.core.tenant.tenant_service import TenantService
from engine.core.models.validations.validate_constraint_violation import ValidateConstraintViolation
from engine.core.serializers.yaml_parser import YamlParser


@dataclass(slots=True, kw_only=True)
class DashboardController:
    y_a_m_l__p_a_r_s_e_r: YamlParser = new YamlParser()
    d_a_s_h_b_o_a_r_d__i_d__p_a_t_t_e_r_n: Pattern = Pattern.compile("^id:.*$", Pattern.MULTILINE)
    o_s_s__d_a_s_h_b_o_a_r_d__s_e_t_t_i_n_g_s: str = "kestra.oss.dashboard-settings"
    dashboard_repository: DashboardRepositoryInterface | None = None
    flow_repository: FlowRepositoryInterface | None = None
    tenant_service: TenantService | None = None
    setting_repository: SettingRepositoryInterface | None = None
    model_validator: ModelValidator | None = None

    def search_dashboards(self, page: int, size: int, q: str, sort: list[str]) -> PagedResults[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    def get_dashboard(self, id: str) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def create_dashboard(self, dashboard: str) -> HttpResponse[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_dashboard(self, dashboard: str) -> ValidateConstraintViolation:
        raise NotImplementedError  # TODO: translate from Java

    def update_dashboard(self, id: str, dashboard: str) -> HttpResponse[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_dashboard(self, dashboard: str) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, previous_dashboard: Dashboard, dashboard: Dashboard, source: str) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def delete_dashboard(self, id: str) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def remove_default_dashboard_references(self, dashboard_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_default_dashboards(self) -> HttpResponse[DashboardSettings]:
        raise NotImplementedError  # TODO: translate from Java

    def get_dashboard_chart_data(self, id: str, chart_id: str, global_filter: ChartFiltersOverrides) -> PagedResults[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def build_dashboard_chard_data_query(self, id: str, chart_id: str, global_filter: ChartFiltersOverrides) -> FetchChartDataQuery:
        raise NotImplementedError  # TODO: translate from Java

    def format_labels_filters(self, filters: list[QueryFilter]) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    def preview_chart(self, preview_request: PreviewRequest) -> PagedResults[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def build_chart_preview_data_query(self, preview_request: PreviewRequest) -> FetchChartDataQuery:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_chart_data(self, fetch_chart_data_query: FetchChartDataQuery) -> PagedResults[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_chart(self, chart: str) -> ValidateConstraintViolation:
        raise NotImplementedError  # TODO: translate from Java

    def export_dashboard_chart_data_to_c_s_v(self, id: str, chart_id: str, global_filter: ChartFiltersOverrides) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def export_chart_to_csv(self, preview_request: PreviewRequest) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FetchChartDataQuery:
        chart: Chart[Any] | None = None
        filters: list[QueryFilter] | None = None
        start_date: datetime | None = None
        end_date: datetime | None = None
        tenant_id: str | None = None
        pageable: Pageable | None = None

    @dataclass(slots=True)
    class PreviewRequest:
        chart: str | None = None
        global_filter: ChartFiltersOverrides | None = None
