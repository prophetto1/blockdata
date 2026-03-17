from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\SyncFlows.java
# WARNING: Unresolved types: IOException, InputStream, Pattern

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.git.abstract_sync_task import AbstractSyncTask
from engine.core.models.flows.flow import Flow
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.services.flow_service import FlowService
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SyncFlows(AbstractSyncTask):
    """Sync flows from Git"""
    target_namespace: Property[str]
    n_a_m_e_s_p_a_c_e__f_i_n_d_e_r__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("(?m)^namespace: (.*)$")
    branch: Property[str] = Property.ofValue("main")
    git_directory: Property[str] = Property.ofValue("_flows")
    include_child_namespaces: Property[bool] = Property.ofValue(false)
    delete: Property[bool] = Property.ofValue(false)
    ignore_invalid_flows: Property[bool] = Property.ofValue(false)
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

    @staticmethod
    def replace_namespace(rendered_namespace: str, uri: str, input_stream: InputStream) -> str:
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
    class Output(Output):
        flows: str | None = None

        def diff_file_uri(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SyncResult(SyncResult):
        flow_id: str | None = None
        namespace: str | None = None
        revision: int | None = None
