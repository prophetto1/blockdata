from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.git.abstract_sync_task import AbstractSyncTask
from engine.plugin.core.trigger.flow import Flow
from engine.core.services.flow_service import FlowService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SyncFlows(AbstractSyncTask):
    """Sync flows from Git"""
    n_a_m_e_s_p_a_c_e__f_i_n_d_e_r__p_a_t_t_e_r_n: Pattern | None = None
    branch: Property[str] | None = None
    target_namespace: Property[str]
    git_directory: Property[str] | None = None
    include_child_namespaces: Property[bool] | None = None
    delete: Property[bool] | None = None
    ignore_invalid_flows: Property[bool] | None = None
    flow_service: FlowService | None = None

    def flow_service(self, run_context: RunContext) -> FlowService:
        raise NotImplementedError  # TODO: translate from Java

    def fetched_namespace(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_resource(self, run_context: RunContext, rendered_namespace: str, flow: Flow) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def simulate_resource_write(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def must_keep(self, run_context: RunContext, instance_resource: Flow) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def traverse_directories(self) -> Property[bool]:
        raise NotImplementedError  # TODO: translate from Java

    def write_resource(self, run_context: RunContext, rendered_namespace: str, uri: str, input_stream: InputStream) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def replace_namespace(self, rendered_namespace: str, uri: str, input_stream: InputStream) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def wrapper(self, run_context: RunContext, rendered_git_directory: str, rendered_namespace: str, resource_uri: str, flow_before_update: Flow, flow_after_update: Flow) -> SyncResult:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_resources(self, run_context: RunContext, rendered_namespace: str) -> list[Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def to_uri(self, rendered_namespace: str, resource: Flow) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def output(self, diff_file_storage_uri: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(AbstractSyncTask):
        flows: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SyncResult(AbstractSyncTask):
        flow_id: str | None = None
        namespace: str | None = None
        revision: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(AbstractSyncTask):
    flows: str | None = None

    def diff_file_uri(self) -> str:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class SyncResult(AbstractSyncTask):
    flow_id: str | None = None
    namespace: str | None = None
    revision: int | None = None
