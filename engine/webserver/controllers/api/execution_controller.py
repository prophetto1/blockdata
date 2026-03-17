from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\ExecutionController.java
# WARNING: Unresolved types: ApiCheckFailure, ApiInputAndValue, ApiInputError, ApplicationEventPublisher, Behavior, ChildFilter, Exception, FlowFilter, Flux, IOException, Mono, MultipartBody, MutableHttpResponse, ObjectMapper, OpenTelemetry, Publisher, Resumed, StreamedFile, Style, T, TimeoutException, URISyntaxException, Void

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from engine.core.debug.breakpoint import Breakpoint
from engine.webserver.responses.bulk_error_response import BulkErrorResponse
from engine.webserver.responses.bulk_response import BulkResponse
from engine.core.models.flows.check.check import Check
from engine.core.services.concurrency_limit_service import ConcurrencyLimitService
from engine.core.services.condition_service import ConditionService
from engine.core.events.crud_event import CrudEvent
from engine.webserver.models.events.event import Event
from engine.core.models.executions.execution import Execution
from engine.webserver.services.execution_dependencies_streaming_service import ExecutionDependenciesStreamingService
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.executions.execution_kind import ExecutionKind
from engine.core.models.executions.execution_metadata import ExecutionMetadata
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.plugins.notifications.execution_service import ExecutionService
from engine.webserver.controllers.api.execution_status_event import ExecutionStatusEvent
from engine.core.services.execution_streaming_service import ExecutionStreamingService
from engine.core.models.executions.execution_trigger import ExecutionTrigger
from engine.core.models.storage.file_metas import FileMetas
from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.flows.flow_for_execution import FlowForExecution
from engine.core.models.hierarchies.flow_graph import FlowGraph
from engine.core.runners.flow_input_output import FlowInputOutput
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_scope import FlowScope
from engine.core.services.flow_service import FlowService
from engine.core.topologies.flow_topology_service import FlowTopologyService
from engine.core.services.graph_service import GraphService
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.flows.input import Input
from engine.core.models.flows.input.input_and_value import InputAndValue
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.runners.local_path_factory import LocalPathFactory
from engine.core.storages.namespace_factory import NamespaceFactory
from engine.core.services.namespace_service import NamespaceService
from engine.webserver.responses.paged_results import PagedResults
from engine.plugin.core.flow.pause import Pause
from engine.core.models.query_filter import QueryFilter
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.runners.secure_variable_renderer_factory import SecureVariableRendererFactory
from engine.core.models.flows.state import State
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task
from engine.core.test.flow.task_fixture import TaskFixture
from engine.core.models.executions.task_run import TaskRun
from engine.core.tenant.tenant_service import TenantService
from engine.core.models.flows.type import Type
from engine.plugin.core.trigger.webhook_response import WebhookResponse
from engine.core.services.webhook_service import WebhookService


@dataclass(slots=True, kw_only=True)
class ExecutionController:
    base_path: str | None = None
    flow_repository: FlowRepositoryInterface | None = None
    flow_service: FlowService | None = None
    namespace_service: NamespaceService | None = None
    execution_repository: ExecutionRepositoryInterface | None = None
    graph_service: GraphService | None = None
    flow_input_output: FlowInputOutput | None = None
    storage_interface: StorageInterface | None = None
    execution_service: ExecutionService | None = None
    condition_service: ConditionService | None = None
    concurrency_limit_service: ConcurrencyLimitService | None = None
    streaming_service: ExecutionStreamingService | None = None
    flow_topology_service: FlowTopologyService | None = None
    execution_dependencies_streaming_service: ExecutionDependenciesStreamingService | None = None
    execution_queue: QueueInterface[Execution] | None = None
    kill_queue: QueueInterface[ExecutionKilled] | None = None
    event_publisher: ApplicationEventPublisher[CrudEvent[Execution]] | None = None
    run_context_factory: RunContextFactory | None = None
    initial_preview_rows: int | None = None
    max_preview_rows: int | None = None
    tenant_service: TenantService | None = None
    kestra_url: Optional[str] | None = None
    open_telemetry: Optional[OpenTelemetry] | None = None
    local_path_factory: LocalPathFactory | None = None
    namespace_factory: NamespaceFactory | None = None
    secure_variable_renderer_factory: SecureVariableRendererFactory | None = None
    enable_local_file_preview: bool | None = None
    object_mapper: ObjectMapper | None = None
    webhook_service: WebhookService | None = None

    def search_executions(self, page: int, size: int, sort: list[str], filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter) -> PagedResults[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_absolute_date_time(self, absolute_date_time: datetime, time_range: timedelta, now: datetime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_flow_graph(self, execution_id: str, subflows: list[str]) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    def eval_task_run_expression(self, execution_id: str, task_run_id: str, expression: str) -> EvalResult:
        raise NotImplementedError  # TODO: translate from Java

    def run_context_render(self, flow: Flow, task: Task, execution: Execution, task_run: TaskRun, expression: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution(self, execution_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def delete_execution(self, execution_id: str, delete_logs: bool, delete_metrics: bool, delete_storage: bool) -> HttpResponse[Void]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_executions_by_ids(self, executions_id: list[str], include_non_terminated: bool, delete_logs: bool, delete_metrics: bool, delete_storage: bool) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter, include_non_terminated: bool, delete_logs: bool, delete_metrics: bool, delete_storage: bool) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def search_executions_by_flow_id(self, namespace: str, flow_id: str, page: int, size: int) -> PagedResults[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_execution_by_post_webhook(self, namespace: str, id: str, key: str, path: str, request: HttpRequest[str]) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_execution_by_get_webhook(self, namespace: str, id: str, key: str, path: str, request: HttpRequest[str]) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_execution_by_put_webhook(self, namespace: str, id: str, key: str, path: str, request: HttpRequest[str]) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def webhook(self, namespace: str, id: str, key: str, path: str, request: HttpRequest[str]) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def webhook(self, maybe_flow: Optional[Flow], key: str, path: str, request: HttpRequest[str]) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_execution(self, namespace: str, id: str, inputs: MultipartBody, labels: list[str], wait: bool, revision: Optional[int]) -> Publisher[ExecutionResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_new_execution_inputs(self, namespace: str, id: str, inputs: MultipartBody, labels: list[str], revision: Optional[int]) -> Publisher[ApiValidateExecutionInputsResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def create_execution(self, namespace: str, id: str, inputs: MultipartBody, labels: list[str], wait: bool, revision: Optional[int], schedule_date: Optional[datetime], breakpoints: Optional[str], kind: Optional[ExecutionKind]) -> Publisher[ExecutionResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def execution_url(self, execution: Execution) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_labels(self, labels: list[str]) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_file(self, execution: Execution, path: str, redirect: str) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def download_file_from_execution(self, execution_id: str, path: str) -> HttpResponse[StreamedFile]:
        raise NotImplementedError  # TODO: translate from Java

    def ns_file_to_internal_storage_u_r_i(self, path: str, execution: Execution) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_metadatas_from_execution(self, execution_id: str, path: str) -> HttpResponse[FileMetas]:
        raise NotImplementedError  # TODO: translate from Java

    def restart_execution(self, execution_id: str, revision: int) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def restart_executions_by_ids(self, executions_id: list[str]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def restart_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def replay_execution(self, execution_id: str, task_run_id: str, revision: int, breakpoints: Optional[str]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def replay_execution_withinputs(self, execution_id: str, task_run_id: str, revision: int, breakpoints: Optional[str], inputs: MultipartBody) -> Mono[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def inner_replay(self, execution: Execution, task_run_id: str, revision: int, breakpoints: Optional[str]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def control_revision(self, execution: Execution, revision: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def update_task_run_state(self, execution_id: str, state_request: StateRequest) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def update_execution_status(self, execution_id: str, status: State.Type) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def update_executions_status_by_ids(self, executions_id: list[str], new_status: State.Type) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def update_executions_status_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter, new_status: State.Type) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def kill_execution(self, execution_id: str, is_on_kill_cascade: bool) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def kill_execution(self, execution: Execution, is_on_kill_cascade: bool) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def kill_executions_by_ids(self, executions_id: list[str]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_resume_execution_inputs(self, execution_id: str, inputs: MultipartBody) -> Publisher[ApiValidateExecutionInputsResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def resume_execution(self, execution_id: str, inputs: MultipartBody) -> Publisher[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def resume_found_execution(self, inputs: MultipartBody, execution: Execution, flow: Flow) -> Mono[HttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def create_resumed(self) -> Pause.Resumed:
        raise NotImplementedError  # TODO: translate from Java

    def resume_execution_from_breakpoint(self, execution_id: str, breakpoints: Optional[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def resume_executions_by_ids(self, executions_id: list[str]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def resume_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pause_execution(self, execution_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pause_executions_by_ids(self, executions_id: list[str]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pause_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def kill_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def replay_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter, latest_revision: bool) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def replay_executions_by_ids(self, executions_id: list[str], latest_revision: bool) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def follow_execution(self, execution_id: str) -> Flux[Event[Execution]]:
        raise NotImplementedError  # TODO: translate from Java

    def preview_file_from_execution(self, execution_id: str, path: str, max_rows: int, encoding: str) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def unqueue_execution(self, execution_id: str, state: State.Type) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def unqueue_executions_by_ids(self, executions_id: list[str], state: State.Type) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def unqueue_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter, new_state: State.Type) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def force_run_execution(self, execution_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def force_run_by_ids(self, executions_id: list[str]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def force_run_executions_by_query(self, filters: list[QueryFilter], query: str, scope: list[FlowScope], namespace: str, flow_id: str, start_date: datetime, end_date: datetime, time_range: timedelta, state: list[State.Type], labels: list[str], trigger_execution_id: str, child_filter: ExecutionRepositoryInterface.ChildFilter) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_ids(self, filters: list[QueryFilter]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_from_execution_by_id(self, execution_id: str) -> FlowForExecution:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_from_execution(self, namespace: str, flow_id: str, revision: int) -> FlowForExecution:
        raise NotImplementedError  # TODO: translate from Java

    def list_executable_distinct_namespaces(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def list_flow_executions_by_namespace(self, namespace: str) -> list[FlowForExecution]:
        raise NotImplementedError  # TODO: translate from Java

    def follow_dependencies_executions(self, execution_id: str, destination_only: bool, expand_all: bool) -> Flux[Event[ExecutionStatusEvent]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_latest_executions(self, flow_filters: list[ExecutionRepositoryInterface.FlowFilter]) -> list[LastExecutionResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def export_executions(self, filters: list[QueryFilter]) -> MutableHttpResponse[Flux]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_execution_a_c_l(self, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EvalResult:
        result: str | None = None
        error: str | None = None
        stack_trace: str | None = None

    @dataclass(slots=True)
    class ExecutionResponse(Execution):
        url: str | None = None

        @staticmethod
        def from_execution(execution: Execution, url: str) -> ExecutionResponse:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StateRequest:
        task_run_id: str | None = None
        state: State.Type | None = None

    @dataclass(slots=True)
    class SetLabelsByIdsRequest:
        executions_id: list[str] | None = None
        execution_labels: list[Label] | None = None

    @dataclass(slots=True)
    class LastExecutionResponse:
        id: str | None = None
        flow_id: str | None = None
        namespace: str | None = None
        start_date: datetime | None = None
        status: State.Type | None = None

        @staticmethod
        def of_execution(execution: Execution) -> LastExecutionResponse:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApiValidateExecutionInputsResponse:
        id: str | None = None
        namespace: str | None = None
        inputs: list[ApiInputAndValue] | None = None
        checks: list[ApiCheckFailure] | None = None

        @staticmethod
        def of(id: str, namespace: str, checks: list[Check], inputs: list[InputAndValue]) -> ApiValidateExecutionInputsResponse:
            raise NotImplementedError  # TODO: translate from Java

        @dataclass(slots=True)
        class ApiInputAndValue:
            input: Input[Any] | None = None
            value: Any | None = None
            enabled: bool | None = None
            is_default: bool | None = None
            errors: list[ApiInputError] | None = None

        @dataclass(slots=True)
        class ApiInputError:
            message: str | None = None

        @dataclass(slots=True)
        class ApiCheckFailure:
            message: str | None = None
            style: Check.Style | None = None
            behavior: Check.Behavior | None = None
