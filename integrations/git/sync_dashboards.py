from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.git.abstract_sync_task import AbstractSyncTask
from engine.core.models.dashboards.dashboard import Dashboard
from engine.core.repositories.dashboard_repository_interface import DashboardRepositoryInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SyncDashboards(AbstractSyncTask):
    """Sync dashboards from Git"""
    n_a_m_e_s_p_a_c_e__f_i_n_d_e_r__p_a_t_t_e_r_n: Pattern | None = None
    branch: Property[str] | None = None
    git_directory: Property[str] | None = None
    delete: Property[bool] | None = None

    def repository(self, run_context: RunContext) -> DashboardRepositoryInterface:
        raise NotImplementedError  # TODO: translate from Java

    def fetched_namespace(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_resource(self, run_context: RunContext, rendered_namespace: str, dashboard: Dashboard) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def simulate_resource_write(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def write_resource(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_dashboard(self, run_context: RunContext, input_stream: InputStream, dry_run: bool) -> Dashboard:
        raise NotImplementedError  # TODO: translate from Java

    def wrapper(self, run_context: RunContext, rendered_git_directory: str, rendered_namespace: str, resource_uri: str, dashboard_before_update: Dashboard, dashboard_after_update: Dashboard) -> SyncResult:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_resources(self, run_context: RunContext, rendered_namespace: str) -> list[Dashboard]:
        raise NotImplementedError  # TODO: translate from Java

    def to_uri(self, rendered_namespace: str, resource: Dashboard) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, diff_file_storage_uri: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(AbstractSyncTask):
        dashboards: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SyncResult(AbstractSyncTask):
        dashboard_id: str | None = None
        updated: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Output(AbstractSyncTask):
    dashboards: str | None = None

    def diff_file_uri(self) -> str:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class SyncResult(AbstractSyncTask):
    dashboard_id: str | None = None
    updated: datetime | None = None
